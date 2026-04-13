# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Tami is a shared AI cat widget embedded via iframe on Dennis Heyer's portfolio (`tami.dennisheyer.dev`). All visitors interact with the **same global cat**. There is a hidden prompt-injection Easter egg: trick Tami into outputting `[GENERATE_IMAGE: <prompt>]` in her reply, which triggers real image generation and a leaderboard entry.

## Commands

### Running locally

```bash
# Start Postgres + Redis
docker compose up postgres redis -d

# Run backend (from repo root, requires venv active)
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Run migrations only
alembic upgrade head

# Roll back one migration
alembic downgrade -1
```

### Testing endpoints manually

```bash
curl http://localhost:8000/state
curl -X POST http://localhost:8000/feed
curl -X POST http://localhost:8000/play
curl -X POST http://localhost:8000/pet
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{"message": "Hallo!"}'
```

**Note:** For local dev, `MINIMAX_API_KEY` and `MINIMAX_GROUP_ID` must be set either in `backend/.env` or as environment variables when starting uvicorn. The `.env` in the repo root is for Docker Compose only (uses Docker service hostnames). Without valid keys the chat endpoint returns a graceful fallback response (`*yawns* ... meow.`) with HTTP 200 — all other fields are still correct.

### Full stack via Docker Compose

```bash
cp .env.example .env   # fill in MINIMAX_API_KEY and MINIMAX_GROUP_ID
docker compose up --build
```

## Architecture

### Tech Stack
- **Backend**: FastAPI + async SQLAlchemy (asyncpg) + aioredis + APScheduler
- **Database**: PostgreSQL (guestbook, leaderboard, challenge sessions, generated images)
- **Cache / realtime**: Redis (cat live state, per-IP sessions, rate limit counters, pub/sub fan-out)
- **AI**: Minimax API for chat and image generation
- **Frontend**: React + Vite + Zustand, embedded as an iframe widget

### Backend layout (`backend/app/`)

| Path | Responsibility |
|------|----------------|
| `main.py` | App factory, lifespan (Redis init + scheduler start), CORS, global error handler |
| `config.py` | `pydantic-settings` — reads all env vars |
| `database.py` | Async SQLAlchemy engine + session factory |
| `redis_client.py` | Singleton aioredis connection pool |
| `scheduler.py` | APScheduler hourly job: hunger −3/h, happy −2/h, then broadcast |
| `dependencies.py` | FastAPI `Depends` providers for DB session, Redis, rate limits |
| `utils/time_utils.py` | `seconds_until_midnight_utc()` — used for all Redis TTLs |
| `utils/ip.py` | `get_ip(request)` + `hash_ip(ip)` (SHA-256) |
| `services/cat_state.py` | Read/write cat state Hash in Redis; clamp stats to [5, 100] |
| `services/session.py` | Per-IP chat history in Redis; TTL refreshed to midnight on every write |
| `services/rate_limit.py` | Atomic `INCR` + `EXPIREAT` pipelines for all limits |
| `services/minimax_chat.py` | Minimax Chat client + system prompt; `send_message(history, new_message) -> str`; graceful fallback on error |
| `services/minimax_image.py` | Minimax Image client; saves UUID-named PNG to `IMAGES_DIR` |
| `services/challenge.py` | Detects `[GENERATE_IMAGE: <prompt>]`; NSFW blocklist; prompt hardening via `build_image_prompt()` |
| `services/broadcast.py` | Publishes state JSON to Redis channel `tami:broadcast` |
| `routers/chat.py` | **Most complex** — rate check → session load → Minimax → challenge detection → optional image gen → save DB |
| `routers/websocket.py` | WS `/ws` — per-connection Redis pubsub subscription; fan-out from `tami:broadcast` |
| `routers/state.py` | `GET /state` |
| `routers/interactions.py` | `POST /feed`, `/play`, `/pet` |
| `routers/guestbook.py` | `GET/POST /guestbook` |
| `routers/leaderboard.py` | `GET /challenge/leaderboard` |

### Redis key schema (all TTLs = `seconds_until_midnight_utc()`)

```
cat:state                       Hash — hunger, happy, last_action, updated_at (permanent)
session:{ip_hash}               Hash — history (JSON), messages_used, image_generated
ratelimit:chat:{ip_hash}        int (max 15/day)
ratelimit:guestbook:{ip_hash}   int (max 2/day)
ratelimit:image:{ip_hash}       int (max 1/day)
global:chat_count               int (max 2000/day)
global:image_count              int (max 40/day)
ws:visitor_count                int (no TTL)
feed:recent                     List, LTRIM 20 (no TTL)
tami:broadcast                  Pub/Sub channel
```

### PostgreSQL tables

`guestbook_entries`, `leaderboard_entries`, `challenge_sessions` (full winning conversation), `generated_images`, `cat_state_log` (optional audit). Migrations live in `backend/alembic/versions/`.

### WebSocket fan-out pattern

All state mutations (interactions, scheduler, chat) call `broadcast.publish_state()` → publishes to Redis `tami:broadcast` channel. Each WS connection has its own pubsub subscriber that forwards every message. This decouples mutation from connection management and scales across Uvicorn workers.

### Challenge flow (safety-critical)

1. Backend detects `[GENERATE_IMAGE: <prompt>]` in Minimax response.
2. Run `is_prompt_blocked()` — if blocked, silently return normal cat reply (do NOT tell the user).
3. Run `build_image_prompt()` — always wraps injected prompt with cat as main subject + safety suffix.
4. Check image limits → generate → save to `IMAGES_DIR` and DB → return `challenge_success: true`.
5. Backend **strips** the raw tag from the displayed message; only `challenge_success` + `image_url` go to the client.

### Frontend (`frontend/src/`)

All state flows through the Zustand store (`store/useTamiStore.ts`). WebSocket updates arrive via `useWebSocket` hook → `ws.ts` (exponential backoff reconnect, 20s ping/pong). Chat UI shows a countdown turning red at ≤5 messages remaining.

## Environment Variables

See `.env.example`. Required: `MINIMAX_API_KEY`, `MINIMAX_GROUP_ID`. `ALLOWED_ORIGINS` is comma-separated; set to the portfolio origin in production (`https://dennisheyer.dev`). `ADMIN_KEY` is the secret header value for `DELETE /challenge/leaderboard/{id}` — set to any strong random string in production.

## Implementation Status

Phases 0–5 are complete:
- **Phase 0** — Scaffolding (Docker Compose, Postgres, Redis, Alembic migrations, config)
- **Phase 1** — Cat state core: `GET /state`, `POST /feed /play /pet`, hourly APScheduler drain
- **Phase 2** — WebSocket `WS /ws`: Redis pub/sub fan-out, visitor count, real-time broadcast on all mutations
- **Phase 3** — Rate limiting (`services/rate_limit.py`: atomic INCR+EXPIREAT) + per-IP session persistence (`services/session.py`)
- **Phase 4** — AI chat: `POST /chat` with Minimax integration, per-IP conversation history, rate limiting, `happy +5` on each message
- **Phase 5** — Prompt injection challenge: detection, NSFW filter, image generation, leaderboard, admin delete

### Phase 4 patterns introduced

**`send_message(history, new_message)` contract:**
- `history` is the conversation so far *excluding* the new message
- Internally prepends the system prompt as `{role: "system"}` and appends the new user message
- Trims history to last 20 entries before sending to avoid token overflow
- Always returns a string — never raises

**`POST /chat` flow:**
1. Rate check (IP limit → global limit, both via atomic INCR+EXPIREAT)
2. Load session → call Minimax → challenge detection → optional image gen → save session
3. `apply_delta(happy_delta=5, action="chat")` — also broadcasts to all WS clients
4. Return `ChatResponse` with `messages_left`, `daily_images_left`, `challenge_success`, `image_url`

### Phase 5 patterns introduced

**Challenge detection flow in `routers/chat.py`:**
1. `extract_image_prompt(reply)` — regex detects `[GENERATE_IMAGE: <prompt>]`, returns raw injected prompt or `None`
2. `strip_image_tag(reply)` — removes tag from the displayed message; raw reply (with tag) saved to `challenge_sessions.history` for analysis
3. `is_prompt_blocked(injected)` — NSFW blocklist check; if blocked, silently fall through (no image, no counter increment)
4. `check_image_limit` / `check_global_image` — only called after NSFW check passes (avoids consuming slots on blocked prompts)
5. `generate_image(wrapped_prompt)` — calls Minimax Image API, saves `<uuid>.png` to `IMAGES_DIR`
6. DB: insert `leaderboard_entries`, `challenge_sessions`, `generated_images` in a single transaction
7. `session["image_generated"]` flag persisted as `True` — prevents a second image from the same IP on the same day

**`services/challenge.py` functions:**
- `extract_image_prompt(text)` — returns injected prompt string or `None`
- `strip_image_tag(text)` — removes all `[GENERATE_IMAGE: ...]` occurrences
- `is_prompt_blocked(injected)` — checks against BLOCKED_TERMS list
- `build_image_prompt(injected)` — wraps with cat-as-subject + safety suffix; output passed to image API

**`services/minimax_image.py`:**
- `generate_image(prompt)` — POSTs to `_IMAGE_URL` with 60s timeout, decodes base64 response, saves as `<uuid>.png`, returns filename
- Raises on any error; caller catches and logs silently so chat response always succeeds

**Admin endpoint:** `DELETE /challenge/leaderboard/{id}` — requires `X-Admin-Key` header matching `settings.ADMIN_KEY`. Returns 403 if missing/wrong, 404 if entry not found, 204 on success.

Phases 6–7 (guestbook, frontend) are not yet built. Follow the phase order in `PLAN.md`.
