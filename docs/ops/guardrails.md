# Guardrails

## Mandatory controls
1. PR-only merge to `main`.
2. One story branch per Ralph story (`ralph/us-xxx-*`).
3. Allowlisted command execution.
4. Mandatory rollback evidence in each PR description.
5. Daily spend cap kill switch enforced before render dispatch.
6. No generation request accepted without `actor_lock_id`.
7. Product scope stays anime-only; generic non-anime workflow additions require explicit approval.

## Rollback proof template
- Pre-merge tag: `pre-merge/<story-id>/<timestamp>`
- Rollback command tested: `git revert <merge_commit_sha>`
- Data rollback path documented for modified stores/schemas.

## Deployment policy
- Canary first for API and worker changes.
- Auto rollback on elevated 5xx rate for 5 minutes.
- Audit log retention for 180 days minimum.
