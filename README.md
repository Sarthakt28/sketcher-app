# 🎨 Sketcher — Real-Time Collaborative Whiteboard

[![Turborepo](https://img.shields.io/badge/Turborepo-v2.9-EF4444?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build/)
[![Next.js](https://img.shields.io/badge/Next.js-v16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express.js-v4.21-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![WebSocket](https://img.shields.io/badge/WebSockets-ws-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://github.com/websockets/ws)
[![Prisma](https://img.shields.io/badge/Prisma-v5.22-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v10-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)

**Sketcher** is a premium, real-time collaborative whiteboard and diagramming application. Draw together with teammates on a fully infinite canvas featuring sub-millisecond smooth zooming and panning, multi-touch gestures, live room chat, WebSocket synchronization, comprehensive geometric shape tools, undo/redo state history, and single-click room sharing.

The codebase is built as a high-performance **Turborepo monorepo** with **Next.js 16**, **Express.js**, **WebSockets (`ws`)**, **Prisma ORM**, and **PostgreSQL**.

---

## ✨ Key Features

### 🖼️ Infinite Canvas Engine & Multi-Touch Support
- **Pan Navigation**: Drag with the **Hand tool**, hold **Spacebar + Left Click**, or use **Middle Mouse Drag**.
- **Multi-Touch Gestures**: Seamless 2-finger pinch-to-zoom and 2-finger canvas panning on mobile & tablet touchscreens.
- **Gesture Mutex & Cancellation**: Intelligent gesture locking prevents accidental "ghost shape" creation when transitioning between single-finger drawing and multi-touch zooming.
- **Responsive Zoom**: Mouse scroll wheel or bottom-left zoom controls — smooth scaling from `10%` to `2000%` centered at your cursor.
- **Dynamic Dot Grid**: Hardware-accelerated background dot grid pattern that pans and zooms seamlessly.
- **One-Click Recenter**: Reset zoom and camera view to original canvas origin `(0, 0)`.

### 🎨 Drawing, Selection & Formatting Tools
| Tool | Symbol | Description |
| :--- | :---: | :--- |
| **Pencil** | ✏️ | Freehand smooth stroke drawing |
| **Rectangle** | ▭ | Axis-aligned box and square shapes |
| **Circle** | ○ | Centered circle and ellipse drawing |
| **Arrow** | → | Directional arrows with calculated head tips |
| **Triangle** | △ | Geometric triangle outlines |
| **Text** | T | Dynamic inline canvas text labels |
| **Eraser** | ◌ | Custom canvas shape eraser tool |
| **Select** | ↖ | Select, drag, translate, and live re-style existing drawn shapes |
| **Hand** | ✋ | Pan tool to move across the infinite canvas |

### 🌈 Live Formatting & Style System
- **Color Palette (8 Curated Colors)**: White (`#FFFFFF`), Red (`#EF4444`), Orange (`#F97316`), Yellow (`#EAB308`), Green (`#22C55E`), Blue (`#3B82F6`), Purple (`#A855F7`), Pink (`#EC4899`).
- **Stroke Widths (4 Levels)**: Thin (`2px`), Medium (`6px`), Thick (`12px`), Extra Thick (`20px`).
- **Selected Shape Property Updating**: Changing stroke color or size while a shape is selected live-updates both local canvas and WebSocket peers.

### 💬 Real-Time Mobile-Responsive Live Room Chat
- **Right-Side Collapsible Sidebar**: Dark glassmorphism chat panel (`w-[calc(100vw-1rem)] sm:w-96`) docked on the right side of the canvas.
- **Instant Display Name Prompt**: First-time open prompts room participants (`What is your name? 👋`) with instant setup & edit options.
- **Tab-Isolated Session Identities (`sessionStorage`)**: Distinct participant names per tab/window, resolving identity collision during local multi-tab testing.
- **Real-Time Broadcast & DB Storage**: Text messages broadcast instantly via WebSockets (`user_text_message`) and persist to PostgreSQL via Prisma.
- **Unread Badge Indicator**: Floating animated unread message count badge when the chat panel is collapsed.

### 👥 Multiplayer Real-Time Sync & Auto-Reconnect
- Non-blocking **WebSockets** for shape and chat message broadcasting.
- **Self-Healing Auto-Reconnect**: Reconnects automatically (3 retry attempts with 1.5s delay) during temporary network drops or backend reboots.
- **Room Isolation**: Canvas and chat states are strictly isolated per room slug/ID.
- **Persistent DB Storage**: Shapes & chat logs are saved directly to PostgreSQL for session restoration.
- **One-Click Share**: Copy direct room access link (`/canvas/<roomId>`) to clipboard.

### ↩️ History & Export Options
- **Multi-Level Undo / Redo**: Multi-level state history tracking for shape additions and deletions.
- **Multi-Format Export**: Export canvas drawings as **PNG**, **SVG**, or raw shape **JSON** files.

### 🖥️ Modern Responsive Dark UI
- **Responsive Clipless Floating Toolbar**: Outer flex container with horizontally scrollable tool buttons and un-clipped dropdown menus on mobile.
- **Landing & Lobby Page**: Sleek dark aesthetic with dynamic glassmorphism, animated feature grids, room creation, and user auth (Signup/Signin).

---

## 🛠️ Monorepo Architecture & Tech Stack

```
sketcher/
├── apps/
│   ├── web/                 # Next.js 16 Web App (Landing, Auth, Canvas, Chat)   → Port 3000
│   ├── http-backend/        # Express REST API (Auth, Rooms, Shape/Chat History) → Port 3002
│   ├── ws-backend/          # WebSocket Gateway (Live Shape & Chat Broadcast)    → Port 8080
│   └── docs/                # Developer Documentation App                        → Port 3001
├── packages/
│   ├── db/                  # Prisma ORM client & PostgreSQL database schema
│   ├── common/              # Shared Zod validation schemas & TypeScript types
│   ├── backend-common/      # Shared backend utilities & JWT configuration
│   ├── ui/                  # Shared React UI component library
│   ├── typescript-config/   # Shared tsconfig base files
│   └── eslint-config/       # Shared ESLint linting rules
├── docker-compose.yml       # Monorepo Docker orchestration (Dev)
├── docker-compose.prod.yml  # Monorepo Docker orchestration (Prod)
└── turbo.json               # Turborepo task pipeline configuration
```

### Stack Summary

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Monorepo** | [Turborepo](https://turbo.build/) + [pnpm Workspaces](https://pnpm.io/) | Fast builds, task caching, and shared dependency management |
| **Frontend** | [Next.js 16](https://nextjs.org/), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) | Web application interface, HTML5 Canvas rendering & live chat UI |
| **HTTP API** | [Express.js](https://expressjs.com/), [bcrypt](https://github.com/kelektiv/node.bcrypt.js), [JWT](https://jwt.io/) | User authentication (signup/signin), room details & REST history API |
| **Real-Time WS** | [ws](https://github.com/websockets/ws) | Low-latency WebSocket room gateway for shapes and text messages |
| **Validation** | [Zod](https://zod.dev/) | End-to-end schema validation shared across frontend & backends |
| **ORM & DB** | [Prisma](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/) | Type-safe queries, migration management, and cloud database persistence |
| **Containers** | Docker & Docker Compose | Containerized dev/prod deployment environments |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **pnpm**: `v10.0.0` or higher (`npm i -g pnpm`)
- **Docker Desktop** *(Optional - for running local Postgres)*

---

### 1. Clone the Repository
```bash
git clone https://github.com/sarthakt28/sketcher-app.git
cd sketcher-app
```

---

### 2. Install Workspace Dependencies
```bash
pnpm install
```

---

### 3. Configure Environment Variables

Create `.env` files with your `DATABASE_URL` and `JWT_SECRET` as required:

#### Root & Package `.env` setup:
Create `.env` files in the following folders:
- `./.env`
- `./packages/db/.env`
- `./apps/http-backend/.env`
- `./apps/ws-backend/.env`

#### Sample `.env` content:
```env
DATABASE_URL="postgresql://sketcher:sketcher_password@localhost:5433/sketcherdb"
JWT_SECRET="my_super_secret_jwt_key_123"
PORT=3002
```

> **Note (Neon Cloud Postgres):** You can also use hosted Neon PostgreSQL:
> `DATABASE_URL="postgresql://neondb_owner:<password>@<host>.neon.tech/neondb?sslmode=require"`

---

### 4. Database Setup & Migration

If using local PostgreSQL with Docker, start the database container:
```bash
docker compose up -d postgres
```

Generate the Prisma Client and push schema to database:
```bash
cd packages/db
npx prisma db push
cd ../..
```

---

### 5. Run Local Development Stack

From the root directory, launch all apps in parallel using Turborepo:

```bash
pnpm run dev
```

#### Application Endpoints:
| Service | URL / Port | Description |
| :--- | :--- | :--- |
| 🎨 **Sketcher Web & Canvas** | [http://localhost:3000](http://localhost:3000) | Main App (Landing `/`, Canvas `/canvas/[roomId]`, Auth) |
| 📖 **Docs Workspace** | [http://localhost:3001](http://localhost:3001) | Developer documentation site |
| ⚙️ **HTTP Express Backend** | [http://localhost:3002](http://localhost:3002) | REST endpoints (`/signup`, `/signin`, `/room`, `/chats`) |
| 🔌 **WebSocket Server** | `ws://localhost:8080` | Multiplayer drawing & chat WebSocket gateway |

---

## ⚡ Vercel Deployment Guide (Frontend App)

The Next.js Web application (`apps/web`) is configured for seamless deployment on **Vercel**:

### 1. Import Repository on Vercel
- Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project**.
- Select the `sketcher-app` repository.

### 2. Configure Vercel Project Settings
- **Root Directory**: Set to `apps/web` *(Critical for Turborepo)*.
- **Include source files outside of the Root Directory**: Enable (Check ✅).
- **Framework Preset**: Next.js.
- **Build Command**: Automatically handled by [`apps/web/vercel.json`](./apps/web/vercel.json):
  ```bash
  cd ../.. && npx turbo run build --filter=web
  ```

### 3. Add Environment Variables on Vercel
In Vercel **Project Settings → Environment Variables**:
```env
NEXT_PUBLIC_HTTP_BACKEND=https://your-http-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-ws-backend.onrender.com
```

---

## ☁️ Render.com Deployment (Backends)

The HTTP and WebSocket backends are optimized for deployment on **Render.com** using Docker runtimes:

1. **HTTP Backend Service (`apps/http-backend`)**
   - **Type**: Web Service
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `apps/http-backend/Dockerfile`
   - **Environment Variables**:
     - `DATABASE_URL`: Neon PostgreSQL connection URL
     - `JWT_SECRET`: Secure signing key
     - `PORT`: `3002`

2. **WebSocket Backend Service (`apps/ws-backend`)**
   - **Type**: Web Service
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `apps/ws-backend/Dockerfile`
   - **Environment Variables**:
     - `DATABASE_URL`: Neon PostgreSQL connection URL
     - `JWT_SECRET`: Matching signing key from HTTP backend
     - `PORT`: `8080`

---

## 📡 API Reference

### HTTP REST Endpoints (`apps/http-backend`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/` | ❌ | Health check endpoint |
| `POST` | `/signup` | ❌ | Register new account (`{ username, password, name }`) |
| `POST` | `/signin` | ❌ | Authenticate & obtain JWT token (`{ username, password }`) |
| `POST` | `/room` | ✅ | Create a new room (`{ name }`) |
| `GET` | `/room/:slug` | ❌ | Fetch room details by slug (Auto-creates if missing) |
| `GET` | `/chats/:roomId` | ❌ | Fetch stored shapes/chat history for a room |

### WebSocket Event Protocol (`apps/ws-backend`)

| Event Name | Direction | Payload Example / Description |
| :--- | :---: | :--- |
| `join` | Client → Server | `{ type: "join", roomId: "108" }` — Joins client to room broadcast pool |
| `chat` | Client → Server | `{ type: "chat", roomId: "108", message: JSON.stringify(shape) }` — Broadcasts shape & saves to DB |
| `user_text_message` | Client → Server | `{ type: "user_text_message", roomId: "108", message: "Hi!", senderName: "Sarthak" }` — Broadcasts room chat message & saves to DB |
| `delete_shape` | Client → Server | Broadcasts shape deletion to room participants & deletes from DB |
| `clear_canvas` | Client → Server | Broadcasts canvas clear event to room participants & clears room shapes in DB |
| `user_text_message` | Server → Client | Relays text chat message with timestamp & sender name to room users |
| `chat` | Server → Client | Relays newly drawn shape to all other room users |
| `get_user_count` | Client → Server | `{ type: "get_user_count", roomId: "108" }` — Requests real-time participant count |
| `room_user_count` | Server → Client | `{ type: "room_user_count", roomId: "108", count: 3 }` — Broadcasts live online participant count |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
