# API Notes

Public endpoints are versioned under `/v1`.

- Auth boundary (cloud mode):
  - API gateway forwards `x-genga-internal-token` to control-api.
  - control-api enforces token when `CONTROL_ENFORCE_GATEWAY_AUTH=true`.
  - inference-api enforces token when `INFERENCE_ENFORCE_INTERNAL_AUTH=true`.

- Sync: `POST /v1/sync/room-token`
- Anime: `GET /v1/anime/shot-templates`, `GET /v1/anime/model-router`, `GET|POST /v1/anime/camera-presets*`, `GET /v1/anime/scene-ideas`
- Graph: `GET|PUT /v1/graph/{project_id}`
- Style bible: `GET|PUT /v1/style-bible/{project_id}`
- Style DNA: `POST /v1/style-dna`, `GET /v1/style-dna/{project_id}`, `GET /v1/style-dna/profile/{id}`, `POST /v1/style-dna/{id}/drift-check`
- Actors: `POST /v1/actors`, `POST /v1/actors/{id}/lock`
- Render: `POST /v1/render/keyframes`, `POST /v1/render/interpolate`, `POST /v1/render/parallel-explore`, `GET /v1/jobs/{id}`
- Autopilot: `POST /v1/autopilot/suggest-shot`, `POST /v1/autopilot/retake-plan`
- Inspiration: `POST /v1/inspiration/rank`, `POST /v1/inspiration/remix`
- Episode board: `GET|PUT /v1/episode-board/{project_id}`, `POST /v1/episode-board/{project_id}/critical-path`
- Director notes: `POST /v1/notes/parse`
- Review: `POST /v1/redlines`, `GET /v1/redlines/{project_id}/{shot_id}`, `GET /v1/approval-gates/{project_id}/{shot_id}`, `POST /v1/approval-gates/{project_id}/{shot_id}/{action}`
- Provenance: `POST /v1/provenance/events`, `GET /v1/provenance/{project_id}`
- Variant telemetry: `POST /v1/variants/telemetry`, `GET /v1/variants/telemetry/{project_id}`
- Cost: `GET /v1/cost/estimate`
- Extensions: `GET /v1/extensions`, `POST /v1/extensions/install`, `POST /v1/extensions/{id}/execute`
- Background/layout: `GET|PUT /v1/background-layout/{project_id}/{scene_id}`, `POST /v1/background-layout/{project_id}/{scene_id}/export`
- Color script: `GET|PUT /v1/color-script/{project_id}`, `POST /v1/color-script/{project_id}/analyze`
- Animatic/deliverables: `POST /v1/animatics/queue`, `POST /v1/render/jobs/{id}/resume`, `POST /v1/deliverables/export`
