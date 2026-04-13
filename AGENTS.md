# AGENTS.md

## Dev Commands

```bash
# Start Postgres + Redis
docker compose up postgres redis -d

# Run backend (from repo root, requires venv active)
cd backend && pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --reload
```

- `backend/entrypoint.sh` runs `alembic upgrade head` automatically on container start — do not run migrations manually in Docker.
- No frontend directory exists yet; `frontend/` in PLAN.md is unimplemented.

## Architecture Notes

- **Backend is at `backend/app/`** — imports use `from app.xxx import yyy`, NOT `from backend.app.xxx`.
- **Phase 1 only is implemented:** cat state, interactions, scheduler, `GET /state`. Phases 2–7 (WebSocket, rate limiting, AI chat, challenge, guestbook, Docker hardening, frontend) are NOT built. Follow `PLAN.md` phase order.
- `cat_state.py` uses Redis WATCH/MULTI/EXEC optimistic concurrency with retry; never mutate hunger/happy directly — always use `apply_delta()`.
- All Redis per-IP keys use `TTL = seconds_until_midnight_utc()` (refreshed on every write).
- IP hashing: `hash_ip(get_ip(request))` → SHA-256 hex in `app/utils/ip.py`.
- `broadcast.publish_state()` is wired into `apply_delta()` and scheduler — it silently drops if no WS subscribers exist (Phase 2).

## Critical unimplemented files (will be needed)

- `backend/app/services/rate_limit.py` — atomic INCR+EXPIREAT pipeline
- `backend/app/services/session.py` — per-IP history with TTL refresh
- `backend/app/services/minimax_chat.py` — Minimax Chat API client
- `backend/app/services/minimax_image.py` — Minimax Image API client
- `backend/app/services/challenge.py` — `[GENERATE_IMAGE: <prompt>]` detection, blocklist, prompt wrapping (safety-critical)
- `backend/app/routers/chat.py` — most complex endpoint; rate check → session → Minimax → challenge → optional image gen
- `backend/app/routers/websocket.py` — Redis pub/sub fan-out WS handler
- `backend/app/routers/guestbook.py` — GET/POST /guestbook
- `backend/app/routers/leaderboard.py` — GET /challenge/leaderboard

## Current Routers (Phase 1)

Only these two routers are mounted in `main.py`:
- `app.routers.state` — `GET /state`
- `app.routers.interactions` — `POST /feed`, `/play`, `/pet`

## PostgreSQL Tables (migrations at `backend/alembic/versions/0001_initial_schema.py`)

`guestbook_entries`, `leaderboard_entries`, `challenge_sessions`, `generated_images`, `cat_state_log`

## Context Files

- `CLAUDE.md` — user-facing project description and architecture overview
- `PLAN.md` — full phase-by-phase implementation plan (read before adding any new service/router)
- `tami-cat-spec.md` — German product spec, chat personality, challenge flow