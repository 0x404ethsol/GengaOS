import platform
import socket
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NPM_EXE = "npm.cmd" if sys.platform.startswith("win") else "npm"


def cmd_output(command: list[str], cwd: Path | None = None) -> tuple[bool, str]:
    try:
        result = subprocess.run(command, cwd=str(cwd) if cwd else None, capture_output=True, text=True, timeout=25)
        text = (result.stdout or "") + (result.stderr or "")
        return result.returncode == 0, text.strip()
    except Exception as exc:
        return False, repr(exc)


def port_open(port: int) -> bool:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(0.3)
    try:
        return sock.connect_ex(("127.0.0.1", port)) == 0
    finally:
        sock.close()


def port_owner(port: int) -> str:
    try:
        netstat = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        for line in (netstat.stdout or "").splitlines():
            if f":{port} " in line and "LISTENING" in line:
                pid = line.strip().split()[-1]
                task = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"], capture_output=True, text=True, timeout=10)
                first = (task.stdout or "").splitlines()
                name = first[3].split()[0] if len(first) > 3 else "unknown"
                return f"pid={pid} ({name})"
    except Exception:
        pass
    return "unknown"


def main() -> int:
    print("GengaOS Doctor")
    print("-----------")
    print(f"OS: {platform.platform()}")

    checks = [
        ("node", ["node", "-v"]),
        ("npm", [NPM_EXE, "-v"]),
        ("python", [sys.executable, "--version"]),
        ("docker", ["docker", "--version"]),
        ("docker compose", ["docker", "compose", "version"]),
    ]

    failed = 0

    for label, command in checks:
        ok, text = cmd_output(command, cwd=ROOT)
        state = "OK" if ok else "FAIL"
        print(f"[{state}] {label}: {text.splitlines()[0] if text else '(no output)'}")
        if not ok:
            failed += 1

    docker_ok, _ = cmd_output(["docker", "info"], cwd=ROOT)
    print(f"[{'OK' if docker_ok else 'WARN'}] docker daemon: {'running' if docker_ok else 'not running'}")

    for port in [8001, 8002, 5173, 8787]:
        if port_open(port):
            print(f"[INFO] port {port}: in use by {port_owner(port)}")
        else:
            print(f"[INFO] port {port}: free")

    npm_ok, _ = cmd_output([NPM_EXE, "run", "typecheck"], cwd=ROOT)
    print(f"[{'OK' if npm_ok else 'WARN'}] typecheck command: {'passes' if npm_ok else 'failing'}")

    if failed:
        print("\nDoctor found blocking issues. Fix failed checks before running full stack.")
        return 1

    print("\nDoctor completed. Use `npm run dev` to boot local services.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
