import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = ROOT / ".tmp_logs"
LOG_DIR.mkdir(exist_ok=True)


@dataclass
class Service:
    name: str
    command: list[str]
    cwd: Path
    url: str
    probe: Callable[[str], bool]


def probe_json_health(url: str) -> bool:
    try:
        with urlopen(url, timeout=2) as response:
            body = response.read().decode("utf-8", errors="ignore")
            return response.status == 200 and '"status"' in body
    except (URLError, TimeoutError, OSError):
        return False


def probe_html(url: str) -> bool:
    try:
        with urlopen(url, timeout=2) as response:
            body = response.read(400).decode("utf-8", errors="ignore").lower()
            return response.status == 200 and "<!doctype html" in body
    except (URLError, TimeoutError, OSError):
        return False


def wait_for_service(service: Service, timeout_seconds: int = 60) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if service.probe(service.url):
            return True
        time.sleep(0.5)
    return False


def run_smoke_checks() -> bool:
    try:
        with urlopen("http://127.0.0.1:8001/v1/anime/shot-templates", timeout=5) as response:
            templates = json.loads(response.read().decode("utf-8"))
            if not templates.get("templates"):
                return False

        actor_request = Request(
            "http://127.0.0.1:8001/v1/actors",
            data=json.dumps({"prompt": "anime protagonist", "references": []}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(actor_request, timeout=10) as response:
            actor = json.loads(response.read().decode("utf-8"))

        lock_request = Request(
            f"http://127.0.0.1:8001/v1/actors/{actor['actorId']}/lock",
            data=b"",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(lock_request, timeout=10) as response:
            lock = json.loads(response.read().decode("utf-8"))

        style_request = Request(
            "http://127.0.0.1:8001/v1/style-dna",
            data=json.dumps({"projectId": "demo-project"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(style_request, timeout=10) as response:
            style = json.loads(response.read().decode("utf-8"))

        explore_request = Request(
            "http://127.0.0.1:8001/v1/render/parallel-explore",
            data=json.dumps(
                {
                    "actorLockId": lock["actorLockId"],
                    "styleDnaId": style["styleDnaId"],
                    "prompt": "anime keyframe exploration",
                    "variants": 2,
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(explore_request, timeout=10) as response:
            explore = json.loads(response.read().decode("utf-8"))
            return len(explore.get("candidates", [])) == 2
    except (URLError, OSError, TimeoutError, KeyError, json.JSONDecodeError):
        return False


def tail_log(path: Path, lines: int = 40) -> str:
    if not path.exists():
        return "(no log file)"
    data = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    return "\n".join(data[-lines:])


def spawn(service: Service) -> tuple[subprocess.Popen, Path, Path]:
    out_path = LOG_DIR / f"{service.name}.out.log"
    err_path = LOG_DIR / f"{service.name}.err.log"
    out_file = out_path.open("w", encoding="utf-8")
    err_file = err_path.open("w", encoding="utf-8")

    process = subprocess.Popen(
        service.command,
        cwd=str(service.cwd),
        stdout=out_file,
        stderr=err_file,
        shell=False,
    )
    return process, out_path, err_path


def stop_processes(processes: list[subprocess.Popen]) -> None:
    if os.name == "nt":
        for process in processes:
            try:
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    capture_output=True,
                    text=True,
                    timeout=8,
                )
            except Exception:
                continue
        return

    for process in processes:
        if process.poll() is not None:
            continue
        process.terminate()

    time.sleep(1)

    for process in processes:
        if process.poll() is None:
            process.kill()


def build_services() -> list[Service]:
    npm_exe = "npm.cmd" if os.name == "nt" else "npm"

    return [
        Service(
            name="control-api",
            command=[
                str(ROOT / "services" / "control-api" / ".venv" / "bin" / "python") if (ROOT / "services" / "control-api" / ".venv").exists() else sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8001",
            ],
            cwd=ROOT / "services" / "control-api",
            url="http://127.0.0.1:8001/health",
            probe=probe_json_health,
        ),
        Service(
            name="inference-api",
            command=[
                str(ROOT / "services" / "inference-api" / ".venv" / "bin" / "python") if (ROOT / "services" / "inference-api" / ".venv").exists() else sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8002",
            ],
            cwd=ROOT / "services" / "inference-api",
            url="http://127.0.0.1:8002/health",
            probe=probe_json_health,
        ),
        Service(
            name="web-studio",
            command=[
                npm_exe,
                "run",
                "dev",
                "--workspace",
                "@genga/web-studio",
                "--",
                "--host",
                "127.0.0.1",
                "--port",
                "5173",
            ],
            cwd=ROOT,
            url="http://127.0.0.1:5173",
            probe=probe_html,
        ),
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="Boot local GengaOS dev services")
    parser.add_argument("--smoke", action="store_true", help="Start services, verify health and anime smoke checks, then stop")
    args = parser.parse_args()

    services = build_services()
    spawned: list[subprocess.Popen] = []

    print("[boot] Starting GengaOS services...")

    try:
        for service in services:
            if service.probe(service.url):
                print(f"[boot] {service.name}: already running ({service.url})")
                continue

            process, out_path, err_path = spawn(service)
            spawned.append(process)
            print(f"[boot] {service.name}: pid={process.pid} logs={out_path.name}/{err_path.name}")

            if not wait_for_service(service, timeout_seconds=90):
                print(f"[boot] ERROR: {service.name} failed health check at {service.url}")
                print("[boot] stdout tail:\n" + tail_log(out_path))
                print("[boot] stderr tail:\n" + tail_log(err_path))
                stop_processes(spawned)
                return 1

            print(f"[boot] {service.name}: healthy")

        print("[boot] All services healthy.")
        print("[boot] control-api:   http://127.0.0.1:8001/health")
        print("[boot] inference-api: http://127.0.0.1:8002/health")
        print("[boot] web-studio:    http://127.0.0.1:5173")

        if args.smoke:
            print("[boot] Running smoke checks...")
            if not run_smoke_checks():
                print("[boot] ERROR: smoke checks failed.")
                stop_processes(spawned)
                return 1
            print("[boot] Smoke checks passed.")
            print("[boot] Smoke mode enabled; stopping spawned services.")
            stop_processes(spawned)
            return 0

        print("[boot] Running. Press Ctrl+C to stop spawned services.")
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[boot] Shutdown requested.")
    finally:
        stop_processes(spawned)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
