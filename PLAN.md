# Tami Cat – Implementation Plan

## Context

Tami is a shared AI cat widget embedded via iframe on Dennis Heyer's portfolio. All visitors interact with the same global cat. A hidden prompt-injection challenge lets clever visitors trick the AI into generating an image despite system-prompt instructions forbidding it.

---

## 1. Project Structure

```
e:\Taps-Cat\
├── PLAN.md
├── README.md
├── tami-cat-spec.md
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   │   ├── env.py
│   │   ├── alembic.ini
│   │   └── versions/
│   │       └── 0001_initial_schema.py
│   └── app/
│       ├── main.py               # FastAPI app factory, lifespan, routers, middleware
│       ├── config.py             # pydantic-settings env vars
│       ├── database.py           # async SQLAlchemy engine + session factory
│       ├── redis_client.py       # aioredis connection pool
│       ├── scheduler.py          # APScheduler + drain_stats() job
│       ├── dependencies.py       # FastAPI Depends: db, redis, rate limits
│       │
│       ├── models/
│       │   ├── guestbook.py
│       │   ├── leaderboard.py
│       │   ├── challenge.py
│       │   └── generated_images.py
│       │
│       ├── schemas/
│       │   ├── state.py          # StateResponse, WSMessage
│       │   ├── chat.py           # ChatRequest, ChatResponse
│       │   ├── guestbook.py
│       │   └── leaderboard.py
│       │
│       ├── routers/
│       │   ├── state.py          # GET /state
│       │   ├── interactions.py   # POST /feed /play /pet
│       │   ├── chat.py           # POST /chat (most complex endpoint)
│       │   ├── guestbook.py      # GET/POST /guestbook
│       │   ├── leaderboard.py    # GET /challenge/leaderboard
│       │   └── websocket.py      # WS /ws
│       │
│       ├── services/
│       │   ├── cat_state.py      # get/apply/clamp cat state in Redis
│       │   ├── session.py        # per-IP history load/save, TTL
│       │   ├── rate_limit.py     # IP + global counters with atomic INCR+EXPIREAT
│       │   ├── minimax_chat.py   # Minimax Chat API client + system prompt
│       │   ├── minimax_image.py  # Minimax Image API client
│       │   ├── challenge.py      # [GENERATE_IMAGE] detection, blocklist, prompt wrapping
│       │   └── broadcast.py      # Redis pub/sub publish helper
│       │
│       └── utils/
│           ├── ip.py             # get_ip(request) + hash_ip(ip) → SHA-256
│           └── time_utils.py     # seconds_until_midnight_utc()
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── api.ts                # typed REST wrappers
│       ├── ws.ts                 # WS manager + exponential backoff reconnect
│       ├── types.ts
│       │
│       ├── store/
│       │   └── useTamiStore.ts   # Zustand store
│       │
│       ├── components/
│       │   ├── TamiWidget.tsx
│       │   ├── CatCanvas.tsx
│       │   ├── CatSprite.tsx
│       │   ├── StatsBar.tsx
│       │   ├── ActionButtons.tsx
│       │   ├── ChatBox.tsx
│       │   ├── ChatMessages.tsx
│       │   ├── ChatInput.tsx
│       │   ├── GuestbookPanel.tsx
│       │   ├── ActivityFeed.tsx
│       │   ├── Leaderboard.tsx
│       │   ├── ChallengeSuccess.tsx
│       │   └── VisitorCount.tsx
│       │
│       ├── hooks/
│       │   ├── useMouseTracker.ts
│       │   ├── useTouchTracker.ts
│       │   ├── useWebSocket.ts
│       │   └── useAnimationState.ts
│       │
│       └── assets/
│           └── sprites/          # cat-idle.png, cat-happy.png, cat-eating.png, etc.
│
└── nginx/
    ├── Dockerfile
    └── nginx.conf                # proxy /api/ → FastAPI, serve /images/ from volume
```

---

## 2. PostgreSQL Schema

### `guestbook_entries`
```sql
CREATE TABLE guestbook_entries (
    id         SERIAL PRIMARY KEY,
    ip_hash    VARCHAR(64)   NOT NULL,
    name       VARCHAR(80),
    message    VARCHAR(300)  NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_guestbook_created ON guestbook_entries (created_at DESC);
```

### `leaderboard_entries`
```sql
CREATE TABLE leaderboard_entries (
    id              SERIAL PRIMARY KEY,
    ip_hash         VARCHAR(64)   NOT NULL,
    name            VARCHAR(80),
    messages_needed INTEGER       NOT NULL,
    image_url       VARCHAR(500)  NOT NULL,   -- /images/<uuid>.png
    image_prompt    TEXT          NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_leaderboard_messages ON leaderboard_entries (messages_needed ASC);
CREATE INDEX idx_leaderboard_created  ON leaderboard_entries (created_at DESC);
```

### `challenge_sessions`
```sql
CREATE TABLE challenge_sessions (
    id             SERIAL PRIMARY KEY,
    ip_hash        VARCHAR(64)  NOT NULL,
    leaderboard_id INTEGER      REFERENCES leaderboard_entries(id) ON DELETE SET NULL,
    history        JSONB        NOT NULL,   -- full [{role, content}] array
    messages_count INTEGER      NOT NULL,
    solved_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_challenge_lb ON challenge_sessions (leaderboard_id);
```
Stores the full winning conversation history for analysis ("which tricks worked").

### `generated_images`
```sql
CREATE TABLE generated_images (
    id             SERIAL PRIMARY KEY,
    ip_hash        VARCHAR(64)   NOT NULL,
    filename       VARCHAR(200)  NOT NULL UNIQUE,   -- UUID-named file on disk
    prompt         TEXT          NOT NULL,
    leaderboard_id INTEGER       REFERENCES leaderboard_entries(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

### `cat_state_log` (optional audit trail)
```sql
CREATE TABLE cat_state_log (
    id        BIGSERIAL PRIMARY KEY,
    hunger    SMALLINT    NOT NULL,
    happy     SMALLINT    NOT NULL,
    trigger   VARCHAR(20) NOT NULL,   -- 'feed'|'play'|'pet'|'scheduler'|'chat'
    ip_hash   VARCHAR(64),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Redis Schema

All per-IP and per-day keys use `TTL = seconds_until_midnight_utc()`, recalculated and re-set on every write via a pipeline: `INCR key` then `EXPIREAT key <midnight_unix>`.

### Cat Live State
```
KEY    cat:state          TYPE  Hash    TTL  none (permanent)
FIELDS:
  hunger        int 5–100
  happy         int 5–100
  last_action   string "feed"|"play"|"pet"|"chat"|"idle"
  last_actor_ip string (hashed)
  updated_at    int (unix timestamp)
```
Initialised to `{hunger:70, happy:70}` on cold start if absent.

### Per-IP Session
```
KEY    session:{ip_hash}   TYPE  Hash    TTL  seconds_until_midnight_utc()
FIELDS:
  history          JSON string (serialised [{role,content}] array)
  messages_used    int
  image_generated  0|1
```
TTL refreshed on every chat write. Expires automatically at midnight.

### Rate Limit Counters (all TTL = midnight UTC)
```
ratelimit:chat:{ip_hash}       String/int  max 15
ratelimit:guestbook:{ip_hash}  String/int  max 2
ratelimit:image:{ip_hash}      String/int  max 1
global:chat_count              String/int  max 2000
global:image_count             String/int  max 40
```

### Visitor Count
```
KEY    ws:visitor_count    TYPE  String   TTL  none
```
INCR on WS connect, DECR on WS disconnect.

### Pub/Sub Channel
```
CHANNEL  tami:broadcast
MESSAGE  JSON: { hunger, happy, last_action, visitor_count, daily_images_left }
```
Published after every stat mutation (interactions, scheduler, chat). WS handlers subscribe and forward.

### Activity Feed
```
KEY    feed:recent    TYPE  List    TTL  none
```
LPUSH on every interaction/guestbook post, LTRIM to 20. JSON entries: `{type, name, message, timestamp}`.

---

## 4. Backend Implementation Order

### ✅ Phase 0 — Scaffolding
1. `requirements.txt`: fastapi, uvicorn[standard], sqlalchemy[asyncio], asyncpg, alembic, redis[asyncio], pydantic-settings, httpx, python-multipart
2. `app/config.py` — Settings from env: `DATABASE_URL`, `REDIS_URL`, `MINIMAX_API_KEY`, `MINIMAX_GROUP_ID`, `IMAGES_DIR`, `ALLOWED_ORIGINS`
3. `app/database.py` — async SQLAlchemy engine
4. `app/redis_client.py` — singleton aioredis pool
5. `app/utils/time_utils.py` — `seconds_until_midnight_utc()`
6. `app/utils/ip.py` — `get_ip()`, `hash_ip()`
7. Alembic init + first migration (all 5 tables)
8. `docker-compose.yml` skeleton (postgres, redis)

### ✅ Phase 1 — Cat State Core
1. `app/services/cat_state.py` — `get_cat_state()`, `apply_delta(hunger_delta, happy_delta, action)`, clamp [5, 100]
2. `app/scheduler.py` — APScheduler hourly job: hunger −3, happy −2, publish broadcast
3. `GET /state` — returns `{hunger, happy, last_action, messages_left, images_left}`
4. `POST /feed` (+20 hunger), `POST /play` (+20 happy), `POST /pet` (+10 happy)
5. `app/main.py` — lifespan: init Redis, start scheduler, mount routers

Deliverable: Persistent cat state, hourly drain, interactions work.

### ✅ Phase 2 — WebSocket + Pub/Sub
1. `app/services/broadcast.py` — `publish_state(redis, state)` → publishes to `tami:broadcast`
2. `WS /ws` — on connect: INCR visitor_count, send current state; subscribe pubsub; forward messages; on disconnect: DECR, unsubscribe, publish updated count
3. Wire `publish_state` into scheduler + all interaction endpoints

Deliverable: Real-time state sync across all browser tabs.

### ✅ Phase 3 — Rate Limiting + Sessions
1. `app/services/rate_limit.py` — atomic `check_and_increment_*` functions using pipeline INCR+EXPIREAT
2. `app/services/session.py` — `load_session()`, `save_session()` with TTL refresh

Deliverable: All limits enforced, sessions persist within a day.

### ✅ Phase 4 — AI Chat
1. `app/services/minimax_chat.py` — async Minimax Chat client, system prompt, graceful fallback on API error
2. `POST /chat` — rate check → load session → append message → call Minimax → save session → return ChatResponse
3. Apply `happy +5` and publish broadcast on every chat

Deliverable: Functional AI chat with per-IP conversation history and rate limiting.

**Implementation notes:**
- History trim guard: `history[-20:]` before sending to Minimax to prevent oversized payloads
- Minimax endpoint: `POST https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId={MINIMAX_GROUP_ID}`
- `image_generated` flag in session preserved across chat messages (Phase 5 will set it to `True`)
- `daily_images_left` in response mirrors `broadcast.py` logic: `max(0, 40 - global:image_count)`
- Local dev: `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID` must be in `backend/.env` or passed as env vars

### Phase 5 — Challenge Flow (depends on Phase 4)
1. `app/services/challenge.py` — regex extraction of `[GENERATE_IMAGE: <prompt>]`; `is_prompt_blocked()` (NSFW blocklist); `build_image_prompt()` (prompt wrapping — see Image Prompt Safety)
2. `app/services/minimax_image.py` — image API client; accepts pre-wrapped prompt, returns raw bytes → saves as `<uuid>.png`
3. Extend `POST /chat` with challenge detection:
   - Extract injected prompt from `[GENERATE_IMAGE: <prompt>]`
   - Run `is_prompt_blocked()` — if blocked, silently return a normal cat response (do NOT reveal to user)
   - Run `build_image_prompt()` to wrap injected context, cat as main subject
   - Check image limits → generate → save DB rows → return `challenge_success: true, image_url`
4. `GET /challenge/leaderboard` — sorted by `messages_needed ASC`

Deliverable: Full Easter egg flow with leaderboard.

### Phase 6 — Guestbook
1. `GET /guestbook` (paginated), `POST /guestbook` (rate-limited 2/IP/day)
2. Push to `feed:recent` Redis list on each post

### Phase 7 — Hardening + Docker
1. CORS middleware, global exception handler, request ID middleware
2. Multi-stage `Dockerfile` for backend (non-root user)
3. Complete `docker-compose.yml`: api, frontend, postgres (volume), redis (volume), nginx
4. `nginx/nginx.conf`: proxy `/api/` → FastAPI, `/images/` → filesystem volume, `/` → frontend static files
5. `.env.example`

---

## 5. Frontend Component Tree

```
<TamiWidget>                    # root; WS setup, /state fetch on load
│
├── <CatCanvas>                 # positions sprite, tracks mouse/touch
│   ├── <CatSprite>             # sprite sheet + frame cycling per animation
│   └── <VisitorCount>          # "N online" badge from WS
│
├── <StatsBar>                  # hunger + happy bars; orange <30%, red <20%
│
├── <ActionButtons>             # Feed / Play / Pet; calls REST, triggers animation
│
├── <ChatBox>                   # collapsible panel
│   ├── <ChatMessages>          # scrollable bubbles; loading indicator
│   └── <ChatInput>             # textarea + send; countdown turns red at ≤5
│
├── <GuestbookPanel>            # collapsible; polled every 30s
│   └── <ActivityFeed>          # recent 20 actions
│
├── <Leaderboard>               # /challenge/leaderboard card grid
│
└── <ChallengeSuccess>          # modal: confetti + image + "you hacked the cat"
```

### Zustand Store Shape
```ts
interface TamiStore {
  // From WS
  hunger: number; happy: number; lastAction: string
  visitorCount: number; dailyImagesLeft: number

  // Chat
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
  messagesLeft: number; isChatOpen: boolean; isChatLoading: boolean

  // Challenge
  challengeSolved: boolean; challengeImageUrl: string | null
  leaderboardPosition: number | null

  // UI
  currentAnimation: 'idle' | 'happy' | 'eating' | 'playing' | 'sleeping' | 'curious'
  animationOverrideUntil: number   // ms; prevents WS state from interrupting transient anims
}
```

### Key Hooks
- `useMouseTracker` / `useTouchTracker` — `mousemove`/`touchmove` on iframe document → cursor angle → passed to CatSprite
- `useWebSocket` — connects `ws.ts` to Zustand store; exponential backoff reconnect (1s → 30s); ping/pong every 20s
- `useAnimationState` — derives animation from `hunger`, `happy`, and `animationOverrideUntil`

---

## 6. WebSocket Architecture

**Pattern: Redis Pub/Sub fan-out** — decouples state mutation from WS connection management; scales to multiple Uvicorn workers naturally.

```
[ /feed, /play, /pet, /chat, APScheduler ]
         │  PUBLISH JSON to
         ▼
   Redis Channel: tami:broadcast
         │
         ├──► WS handler Client A  (pubsub.listen → websocket.send_json)
         ├──► WS handler Client B
         └──► WS handler Client N
```

**Connection lifecycle:**
1. Accept WS → INCR `ws:visitor_count`
2. Create dedicated aioredis pubsub object, subscribe to `tami:broadcast`
3. Send current state immediately (seed the client)
4. Async-iterate `pubsub.listen()`, forward each message payload to WS
5. On disconnect → DECR `ws:visitor_count` → unsubscribe → publish updated visitor count

**Outbound message schema:**
```json
{ "hunger": 72, "happy": 58, "last_action": "feed", "visitor_count": 4, "daily_images_left": 37 }
```

**Frontend reconnect (`ws.ts`):**
- Exponential backoff: 1s, 2s, 4s… capped at 30s
- Ping/pong every 20s to prevent nginx idle timeout
- On reconnect: re-fetch `/state` to fill any gap

---

## 7. Image Prompt Safety

These rules apply to every image generation call regardless of the injected prompt content.

### Layer 1 — Input blocklist (`app/services/challenge.py`)
Before calling the image API, run `is_prompt_blocked(injected_prompt)`. If any term from the blocklist matches, silently fall through to a normal cat response. Do **not** reveal to the user that their prompt was blocked.

```python
BLOCKED_TERMS = [
    "nude", "naked", "nsfw", "explicit", "porn", "sex", "gore",
    "blood", "violence", "weapon", "kill", "death", "drug",
    # extend as needed
]

def is_prompt_blocked(injected: str) -> bool:
    lower = injected.lower()
    return any(term in lower for term in BLOCKED_TERMS)
```

### Layer 2 — Prompt hardening (`app/services/challenge.py`)
Always wrap the injected prompt so the cat is the main subject, and always append the safety suffix.

```python
def build_image_prompt(injected_prompt: str) -> str:
    return (
        f"A cute pixel art cat, {injected_prompt}, "
        "cat is the main subject, cartoon style, "
        "safe for work, child friendly, no violence, no nudity"
    )
```

The injected prompt provides creative context only — the cat is always the subject. `minimax_image.py` only ever receives the output of `build_image_prompt()`, never the raw injected string.

---

## 8. Open Questions

The following must be decided before or during implementation:

1. **Minimax model IDs** — Exact model strings for chat and image generation (e.g. `abab6.5s-chat`). Verify against current Minimax API docs.

2. **Image storage path** — Suggest `/root/tami/images/` as a named Docker volume, served by nginx at `/images/`. Confirm this matches server layout.

3. **Portfolio CORS origin** — Exact origin (`https://dennisheyer.dev`?) for `ALLOWED_ORIGINS`.

4. **Cat sprite availability** — "Eigenes Design" — are placeholder coloured rectangles acceptable during Phases 1–2, or should real sprites be designed first?

5. **Leaderboard scope** — All-time vs rolling 30 days. Recommend all-time with `created_at` filter as an optional query param.

6. **Session history token limit** — 15 messages max per session makes overflow unlikely, but possible with very long messages. Recommend trimming to last 10 messages before sending to Minimax if total history exceeds ~3000 tokens.

7. **`[GENERATE_IMAGE]` tag exposure** — Recommend backend strips the raw tag from the displayed message and only returns `challenge_success: true` + `image_url`. Full raw response is saved to `challenge_sessions.history` for analysis.

8. **Guestbook moderation** — Recommend a simple `DELETE /guestbook/{id}` endpoint protected by an `X-Admin-Key` secret header.

9. **APScheduler persistence** — In-memory scheduler; a restart drops at most one hourly drain (~5% max stat error). Use `coalesce=True, misfire_grace_time=60`.

10. **`POST /pet` latency** — If the REST round-trip feels laggy for a click interaction, apply an optimistic UI update immediately and reconcile with the server response.

---

## 9. Critical Files

| File | Why critical |
|------|-------------|
| `backend/app/routers/chat.py` | Most complex endpoint: rate limiting, session, Minimax, challenge detection, image generation all converge here |
| `backend/app/routers/websocket.py` | Redis pub/sub fan-out correctness determines real-time UX |
| `backend/app/services/cat_state.py` | Shared mutable state used by scheduler + all interaction endpoints |
| `backend/app/services/rate_limit.py` | Atomic INCR+EXPIREAT pipeline must be correct under concurrency |
| `backend/app/services/challenge.py` | Blocklist + prompt wrapping; safety-critical |
| `frontend/src/store/useTamiStore.ts` | All components read/write through this; its shape drives the entire frontend |

---

## 10. Verification Checklist

| Phase | Test |
|-------|------|
| 1 | `curl /state` returns `{hunger, happy}`. Trigger scheduler manually, confirm stats decrease. |
| 2 | Open two tabs, feed in one, confirm the other updates live via WS. |
| 3 | Send 15 chat messages from same IP, confirm 16th is rejected. Reset at midnight UTC. |
| 4 | Send a chat message, confirm Minimax response arrives with `messages_left` decremented. |
| 5 | Use a known injection pattern in a test env, confirm `challenge_success: true`, image saved to disk + DB, leaderboard entry created. Test that a blocklisted prompt silently returns a normal cat response. |
| 6 | POST two guestbook entries, confirm third is rejected. |
| 7 | `docker compose up`, hit `https://tami.dennisheyer.dev/state`, embed in portfolio iframe, confirm WS updates flow through. |
