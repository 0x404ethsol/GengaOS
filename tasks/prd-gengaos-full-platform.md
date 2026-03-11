# PRD: GengaOS Full 1-5 Web-First Implementation

## Introduction
GengaOS is a director-first anime production IDE where creators direct scenes via graph nodes, 3D blocking, and controlled AI generation instead of hand-drawing every frame. The product direction is Flora-style orchestration with a strict anime-only workflow focus.

## Goals
- Deliver all phases 1-5 in a web-first architecture.
- Enforce identity locking before every generation path.
- Provide solo-creator acceleration features (autopilot pack).
- Add extension runtime with policy controls.
- Keep the platform specialized for anime production only, not generic design workflows.

## User Stories
Source of truth for executable story slicing is `ralph/prd.json`.

## Functional Requirements
- FR-1: Implement graph editor with custom studio nodes.
- FR-2: Implement actor creation and identity lock workflows.
- FR-3: Implement virtual set 3D blocking and snapshot controls.
- FR-4: Implement keyframe and interpolation endpoints + UI controls.
- FR-5: Implement extension registry and dynamic MCP node hydration.
- FR-6: Enforce guardrails, audit trails, spend caps, and rollback policies.

## Non-Goals
- Native desktop/Tauri packaging for v1.
- Full enterprise IAM integration in v1.

## Technical Considerations
- Cloudflare workers for gateway/sync.
- FastAPI for control and inference orchestration.
- Runpod as primary remote GPU provider target.
- Add anime style bible and shot grammar APIs as first-class primitives.

## Success Metrics
- Solo creator can run script -> cast -> pose -> render -> export in one session.
- All generation requests validated by actor lock enforcement.
- Collaboration room sync remains stable under reconnect.

## Open Questions
- Billing policy details for Genga credits.
- Extension marketplace moderation policy depth in v1.
