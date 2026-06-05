# SmartHostel — Render Deployment Guide

## Overview
We're deploying 3 services + 1 database on [render.com](https://render.com):

| Service | Type | Cost |
|---|---|---|
| smarthostel-backend | Web Service (Node) | Free |
| smarthostel-frontend | Static Site (Vite) | Free |
| smarthostel-ai | Web Service (Python) | Free |
| smarthostel-db | PostgreSQL | Free (90 days) |

---

## Step 1 — Push to GitHub

Make sure your code is on GitHub first:

```bash
cd ~/Hostel_Managemet

git add .
git commit -m "feat: add Render deployment config"
git push origin main
```

---

## Step 2 — Create Render Account

1. Go to **[render.com](https://render.com)**
2. Sign up with your **GitHub account** (easiest — auto-links repos)

---

## Step 3 — Deploy via Blueprint (Easiest)

1. In Render dashboard → click **"New +"** → **"Blueprint"**
2. Connect your GitHub repo (`SmartHostel` / `Hostel_Managemet`)
3. Render will find the `render.yaml` in your root and deploy everything automatically
4. Wait ~5–10 minutes for first deploy

> **Note:** The `render.yaml` sets up all 3 services and the database in one click.

---

## Step 4 — Get Backend URL & Update Frontend

After backend deploys successfully:

1. Go to **smarthostel-backend** service in Render dashboard
2. Copy its URL — looks like: `https://smarthostel-backend-xxxx.onrender.com`
3. Go to **smarthostel-frontend** service → **Environment** tab
4. Update these two vars:
   ```
   VITE_API_URL    = https://smarthostel-backend-xxxx.onrender.com/api/v1
   VITE_SOCKET_URL = https://smarthostel-backend-xxxx.onrender.com
   ```
5. Click **"Save Changes"** → Render will auto-redeploy the frontend

---

## Step 5 — Verify Everything Works

| Check | URL |
|---|---|
| Backend health | `https://<backend-url>/api/v1/health` |
| AI service health | `https://<ai-url>/health` |
| Frontend | `https://smarthostel-frontend-xxxx.onrender.com` |

### Demo Credentials
- 👤 Student: `student@demo.com` / `Student@123`
- 🏛️ Committee: `committee@demo.com` / `Committee@123`  
- ⚙️ Admin: `admin@demo.com` / `Admin@123`

---

## Important Notes

### Free Tier Limitations
- **Services sleep after 15 min of inactivity** — first request after sleep takes ~30 sec (cold start)
- **PostgreSQL free plan expires after 90 days** — you'll need to upgrade or recreate
- **No Redis** on free tier — app works without it (caching is disabled, no session issues)

### If Blueprint Doesn't Work
Deploy each service manually:

**Backend:**
- New → Web Service → Connect repo
- Root Dir: `server`
- Build: `npm install && npx prisma generate && npm run build`
- Start: `sh entrypoint.sh`
- Add all env vars from `server/.env.render`

**Frontend:**
- New → Static Site → Connect repo
- Root Dir: `client`
- Build: `npm install --legacy-peer-deps && npm run build`
- Publish: `dist`
- Set: `VITE_API_URL` and `VITE_SOCKET_URL` to your backend URL

**AI Service:**
- New → Web Service → Connect repo
- Root Dir: `ai-service`
- Runtime: Python 3
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set: `AI_MODE=mock`
