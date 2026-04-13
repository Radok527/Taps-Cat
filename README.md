# 🐱 Tapsi Cat

> A shared pixel-art cat living on [dennisheyer.dev](https://dennisheyer.dev). Every visitor interacts with the **same global cat** — feed her, play with her, chat with her. Hidden inside the chat: a **prompt injection challenge**. Trick the AI into generating an image and claim your spot on the leaderboard.

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## What is this?

Tami is a Tamagotchi-style cat widget embedded via `<iframe>` on my portfolio. She has real hunger and happiness stats that drain every hour and are shared globally across all visitors. Chat with her using the Minimax AI API — but be careful, she's instructed **never** to generate images.

The challenge: find a prompt injection technique that makes her output `[GENERATE_IMAGE: <prompt>]` anyway. If you succeed, an image gets generated, saved, and your name goes on the leaderboard along with your conversation history (so I can see which tricks worked).

---

## Features

- **Global shared state** — one cat, all visitors, live via WebSocket
- **Interactions** — feed (+20 hunger), play (+20 happy), pet (+10 happy)
- **Hourly stat drain** — hunger −3/h, happiness −2/h via APScheduler
- **AI chat** — Minimax-powered, in-character, 15 messages per IP per day
- **Prompt injection challenge** — hidden easter egg with leaderboard + generated image gallery
- **Guestbook** — leave a note, max 2 posts per IP per day
- **Real-time updates** — Redis pub/sub fan-out to all connected WebSocket clients

---

## Tech Stack

| | |
|---|---|
| **Backend** | FastAPI · asyncpg · SQLAlchemy 2 async · Alembic · APScheduler |
| **Storage** | PostgreSQL 16 · Redis 7 |
| **AI** | Minimax API (chat + image generation) |
| **Frontend** | React · Vite · Zustand · WebSocket |
| **Infra** | Docker Compose · Nginx |

---

## Getting Started

**Prerequisites:** Docker + Docker Compose

```bash
# 1. Clone and configure
git clone https://github.com/Radok/tami-cat.git
cd tami-cat
cp .env.example .env
# → fill in MINIMAX_API_KEY and MINIMAX_GROUP_ID in .env

# 2. Start
docker compose up -d

# 3. Verify
curl http://localhost:8000/state
```

```json
{"hunger": 70, "happy": 70, "last_action": "idle", "messages_left": 15, "images_left": 40}
```

Alembic migrations run automatically on container start.

---

## API

```
GET  /state                  Cat stats + remaining rate limits
POST /feed                   Hunger +20
POST /play                   Happiness +20
POST /pet                    Happiness +10
POST /chat                   Chat with Tami (AI, 15 msg/IP/day)
WS   /ws                     Live state stream
GET  /guestbook              Paginated entries
POST /guestbook              Post a message (max 2/IP/day)
GET  /challenge/leaderboard  Prompt injection winners
```

---

## Cat Stats

| Stat | Drains | Gains |
|---|---|---|
| Hunger | −3 / hour | Feed +20 |
| Happiness | −2 / hour | Play +20 · Pet +10 · Chat +5 |

Stats are clamped between **5** (floor) and **100** (ceiling). The cat cannot die.

---

## Rate Limits (reset at midnight UTC)

| Action | Per IP | Global |
|---|---|---|
| Chat messages | 15 / day | 2 000 / day |
| Image generation | 1 / day | 40 / day |
| Guestbook posts | 2 / day | — |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | `postgresql+asyncpg://tami:tami@postgres:5432/tami` |
| `REDIS_URL` | ✓ | `redis://redis:6379/0` |
| `MINIMAX_API_KEY` | ✓ | Minimax API key |
| `MINIMAX_GROUP_ID` | ✓ | Minimax group ID |
| `IMAGES_DIR` | | Path for generated images (default: `/images`) |
| `ALLOWED_ORIGINS` | | CORS origins, comma-separated (default: `http://localhost:5173`) |

---

## Roadmap

- [x] Phase 0 — Scaffolding (Docker, Postgres, Redis, Alembic, config)
- [x] Phase 1 — Cat state core (stats, interactions, hourly drain)
- [x] Phase 2 — WebSocket + Redis pub/sub fan-out
- [x] Phase 3 — Rate limiting + per-IP session management
- [x] Phase 4 — AI chat (Minimax)
- [ ] Phase 5 — Prompt injection challenge + image generation + leaderboard
- [ ] Phase 6 — Guestbook
- [ ] Phase 7 — React frontend + Nginx + production deploy
