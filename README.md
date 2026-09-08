# SmartHostel Management System

A comprehensive, full-stack platform designed to digitize and streamline hostel management operations. It features a role-based dashboard for Admins, Committee members, and Students, alongside real-time updates and integrated AI capabilities.

**🌍 Live Demo:** [https://ample-learning-production.up.railway.app](https://ample-learning-production.up.railway.app)

## 🚀 Features

- **Role-Based Access Control:** Dedicated portals for Admin, Committee, and Students.
- **Attendance Tracking:** Real-time attendance monitoring via QR code scanning (isolated microservice).
- **Complaints & Maintenance:** Track, manage, and resolve hostel issues with sentiment analysis.
- **Mess Menu Management:** View and update daily/weekly mess menus.
- **Inventory Management:** Keep track of hostel assets and stock levels.
- **Real-Time Notifications:** Instant alerts powered by Socket.io and an async email notification worker.
- **Analytics & Dashboards:** Visual data representation using Recharts.
- **Google OAuth:** Sign in with Google alongside traditional JWT auth.

## 💻 Tech Stack

### Frontend (Client)
- **Framework:** React 18 with TypeScript & Vite
- **Styling:** Tailwind CSS v4, Lucide React
- **Forms & Validation:** React Hook Form, Zod
- **Routing:** React Router DOM v6
- **Real-Time:** Socket.io-client
- **UI Utilities:** clsx, tailwind-merge, react-hot-toast, date-fns, axios
- **Analytics:** Recharts

### Backend (Core API — `server/`)
- **Runtime:** Node.js with Express 5 & TypeScript
- **Database:** PostgreSQL with Prisma ORM v6
- **Caching & Pub/Sub:** Redis (ioRedis)
- **Authentication:** JWT (access + refresh tokens), bcryptjs, Google OAuth 2.0
- **Real-Time:** Socket.io (WebSockets)
- **Email:** Nodemailer (via SMTP / SendGrid)
- **Background Jobs:** node-cron (scheduled tasks)
- **Middleware & Security:** Helmet, CORS, Express Rate Limit, compression, cookie-parser, morgan
- **Validation:** Zod
- **Utilities:** uuid, axios

### Microservices (`services/`)

#### Attendance Service (`services/attendance-service/`)
- **Purpose:** Isolated high-frequency meal/attendance marking with its own failure domain.
- **Stack:** Node.js, Express 5, TypeScript, Prisma v6, ioRedis, JWT
- **RBAC:** Committee / Warden / Admin only; ABAC prevents self-marking.
- **Port:** `5002`

#### Notification Worker (`services/notification-worker/`)
- **Purpose:** Decoupled async email delivery — subscribes to a Redis `notifications:email` pub/sub channel. If this crashes, the main API keeps running.
- **Stack:** Node.js, TypeScript, ioRedis, Nodemailer
- **No exposed port** — worker only, not a server.

### Infrastructure
- **Containerization:** Docker & Docker Compose
- **Database Services:** PostgreSQL 16-alpine, Redis 7-alpine
- **Deployment:** Railway (backend + frontend), nginx (frontend static serving in Docker)

## 📁 Project Structure

```text
SmartHostel/
├── client/                   # React + Vite frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level page components
│   │   ├── stores/           # Zustand state stores
│   │   └── lib/              # API clients, utilities
│   └── ...
├── server/                   # Node.js + Express core API
│   └── src/
│       ├── controllers/      # Route handlers
│       ├── routes/           # API route definitions
│       ├── services/         # Business logic
│       ├── middleware/        # Auth, error handling, etc.
│       ├── sockets/          # Socket.io event handlers
│       ├── jobs/             # Background cron jobs
│       ├── config/           # DB, Redis, env config
│       ├── validators/       # Zod schemas
│       └── utils/            # Logger, helpers
├── services/
│   ├── attendance-service/   # Attendance microservice (port 5002)
│   └── notification-worker/  # Async email worker (Redis pub/sub)
├── docker-compose.yml        # Orchestrates Postgres, Redis, Backend, Attendance, Notification Worker, Frontend
└── ...
```

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) and Docker Compose

### Environment Setup

1. **Clone the repository.**
2. **Setup environment variables:**
   - Copy `server/.env.example` to `server/.env` and update the values (Database URL, JWT secrets, Razorpay keys, Google OAuth credentials, SMTP settings).
   - Copy `client/.env.example` to `client/.env`.

### Running with Docker (Recommended)

The easiest way to get the entire stack running is via Docker Compose.

```bash
# Start all services (PostgreSQL, Redis, Backend, Attendance Service, Notification Worker, Frontend)
docker-compose up -d --build
```

| Service              | URL                        |
|----------------------|----------------------------|
| Frontend             | http://localhost:3000       |
| Backend API          | http://localhost:5001       |
| Attendance Service   | http://localhost:5002       |
| Notification Worker  | (no port — Redis worker)   |

### Running Locally (Without Docker)

#### 1. Database & Redis
Ensure PostgreSQL and Redis are running locally or use Docker to run just the databases:
```bash
docker-compose up -d postgres redis
```

#### 2. Backend Server
```bash
cd server
npm install
npm run db:generate
npm run db:migrate
npm run db:seed    # Optional: seed initial data
npm run dev
```

#### 3. Frontend Client
```bash
cd client
npm install
npm run dev
```

#### 4. Attendance Microservice
```bash
cd services/attendance-service
npm install
npm run dev
```

#### 5. Notification Worker
```bash
cd services/notification-worker
npm install
npm run dev
```

Made with ❤️ by Syam Tammireddi 
