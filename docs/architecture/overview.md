# Architecture Overview

GengaOS v1 is web-first with a cloud control plane:

- `web-studio` is the director UI (graph canvas, virtual set, sakuga tooling).
- `control-api` is the source of truth for projects, graph state, actors, locks, and jobs.
- `sync-worker` provides collaboration rooms and state fan-out.
- `inference-api` orchestrates remote GPU inference jobs (Runpod target).
- `api-gateway-worker` enforces edge auth and room token minting.

## Product Shape
- Flora-style orchestration model: compose workflows on a graph canvas.
- Anime-only specialization: all templates, model routes, and autopilot logic target anime production constraints.
- Core sequence: Script -> Casting -> Actor Lock -> Virtual Set -> Sakuga Pipeline -> Deliverables.

## Anime-Specific Primitives
- Shot templates (`/v1/anime/shot-templates`) for anime composition patterns.
- Style bible (`/v1/style-bible/{projectId}`) to persist project-level anime direction.
- Parallel explore (`/v1/render/parallel-explore`) for rapid keyframe variant exploration.
- Identity lock policy on all generation paths.

## Hard policy
No render generation is allowed without a valid identity lock.
