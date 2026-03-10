import json
import sys
from urllib.error import URLError
from urllib.request import Request, urlopen


def get_json(url: str) -> dict:
    with urlopen(url, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def post_json(url: str, payload: dict) -> dict:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    try:
        control_health = get_json("http://127.0.0.1:8001/health")
        inference_health = get_json("http://127.0.0.1:8002/health")
        print("CONTROL:", control_health)
        print("INFERENCE:", inference_health)

        graph = get_json("http://127.0.0.1:8001/v1/graph/demo-project")
        templates = get_json("http://127.0.0.1:8001/v1/anime/shot-templates")
        style = get_json("http://127.0.0.1:8001/v1/style-bible/demo-project")
        print("GRAPH_REVISION:", graph.get("revision"))
        print("ANIME_TEMPLATES:", len(templates.get("templates", [])))
        print("STYLE_MODE:", style.get("artDirection"))

        actor = post_json("http://127.0.0.1:8001/v1/actors", {"prompt": "hero", "references": []})
        lock = post_json(f"http://127.0.0.1:8001/v1/actors/{actor['actorId']}/lock", {})
        style_dna = post_json("http://127.0.0.1:8001/v1/style-dna", {"projectId": "demo-project"})
        render = post_json(
            "http://127.0.0.1:8001/v1/render/keyframes",
            {
                "actorLockId": lock["actorLockId"],
                "styleDnaId": style_dna["styleDnaId"],
                "frameA": "a",
                "frameB": "b",
                "sketchHint": "arc",
            },
        )
        extensions = get_json("http://127.0.0.1:8001/v1/extensions")
        explore = post_json(
            "http://127.0.0.1:8001/v1/render/parallel-explore",
            {
                "actorLockId": lock["actorLockId"],
                "styleDnaId": style_dna["styleDnaId"],
                "prompt": "sakuga impact",
                "variants": 2,
            },
        )

        print("RENDER_STATUS:", render.get("status"))
        print("PARALLEL_VARIANTS:", len(explore.get("candidates", [])))
        print("EXTENSIONS:", len(extensions.get("extensions", [])))
        print("SMOKE: PASS")
        return 0
    except URLError as error:
        print("SMOKE: FAIL - service unreachable", error)
    except Exception as error:
        print("SMOKE: FAIL -", error)

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
