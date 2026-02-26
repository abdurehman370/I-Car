# iCar — Local Setup Guide

Complete steps to clone, configure, and run the iCar project on a new machine (Linux/macOS). The project has two parts: **iCar** (Next.js + Node) and **scrapper** (Python FastAPI).

---

## Prerequisites

Install these before starting:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.x LTS | Next.js app, worker, cron scripts |
| **npm** | 10+ | Package manager |
| **Python** | 3.10+ | Scraper API |
| **MariaDB** or **MySQL** | 10.x | Application database |
| **Redis** | 6+ | BullMQ job queue for alerts |

---

## 1. Clone the repository

```bash
git clone <your-repo-url> iCar
cd iCar
```

You should see two main folders: `iCar/` (Next.js app) and `scrapper/` (Python scraper).

---

## 2. Install and start MariaDB/MySQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y mariadb-server mariadb-client
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

**macOS (Homebrew):**
```bash
brew install mariadb
brew services start mariadb
```

**Create database and user:**
```bash
sudo mysql -u root -p
```

In the MySQL shell:
```sql
CREATE DATABASE car_evaluator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'icar'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON car_evaluator.* TO 'icar'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Use the same database name and credentials in `.env` (Step 5).

---

## 3. Install and start Redis

**Ubuntu/Debian:**
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Verify:**
```bash
redis-cli ping
```
Expected output: `PONG`.

---

## 4. Install Node.js (if not already installed)

**Using nvm (recommended):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc   # or ~/.zshrc
nvm install 20
nvm use 20
node -v   # should show v20.x
npm -v
```

**Ubuntu (NodeSource):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 5. Configure the Next.js app (iCar)

```bash
cd iCar
```

**Install dependencies:**
```bash
npm install
```

**Create environment file:**
```bash
cp .env.example .env
# If no .env.example exists, create .env manually (see below)
```

Edit `.env` with your values:

```env
# Database (must match the DB you created in Step 2)
DATABASE_URL="mysql://icar:your_password@127.0.0.1:3306/car_evaluator"

# Redis (default if Redis is local)
REDIS_URL=redis://127.0.0.1:6379

# SMTP (Gmail example — use App Password, not account password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# App URL (for emails and links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate Prisma client and run migrations:**
```bash
npx prisma generate
npx prisma migrate deploy
```

If you have no migrations yet (fresh DB):
```bash
npx prisma db push
```

**Create logs directory (for alert worker and cron):**
```bash
mkdir -p logs
```

---

## 6. Run the Next.js app

**Development:**
```bash
npm run dev
```

App: **http://localhost:3000**

**Production build (optional):**
```bash
npm run build
npm start
```

---

## 7. Set up the Python scraper

```bash
cd scrapper
```

**Create virtual environment:**
```bash
python3 -m venv .venv
source .venv/bin/activate   # Linux/macOS
# Windows: .venv\Scripts\activate
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Install Playwright browser (if the scraper uses it):**
```bash
playwright install chromium
```

**Run the scraper API (keep this terminal open):**
```bash
python app.py
```

Scraper API: **http://localhost:8000**

To run in background:
```bash
nohup python app.py >> ../iCar/logs/scraper.log 2>&1 &
```

---

## 8. Alert system (BullMQ worker + cron)

The alert system needs:
1. **Redis** running (Step 3).
2. **Worker process** — processes jobs from the queue.
3. **Cron** — every 5 minutes, pushes new jobs into the queue.

**Start the worker (new terminal, from project root):**
```bash
cd iCar
npm run worker
```

- Worker runs with concurrency 5.
- Bull Board UI: **http://localhost:3001/admin/queues**
- Health: **http://localhost:3001/health**

**Set up cron (optional — only if you want alerts to run every 5 minutes):**

Find your Node path:
```bash
which node
# Example: /home/you/.nvm/versions/node/v20.20.0/bin/node
```

Edit crontab:
```bash
crontab -e
```

Add one line (replace `YOU` and path if needed):
```cron
*/5 * * * * cd /home/YOU/iCar/iCar && /home/YOU/.nvm/versions/node/v20.20.0/bin/node node_modules/.bin/tsx src/scripts/cron-push-alerts.ts >> logs/cron-push.log 2>&1
```

Use the **absolute path** to `node` and the **absolute path** to your `iCar` folder. Cron does not load your shell profile (nvm, etc.).

**Manually push alert jobs (without cron):**
```bash
cd iCar
npm run push:alerts
```

---

## 9. Summary — what to run and in what order

| Order | Command | Where | Purpose |
|-------|---------|--------|---------|
| 1 | `sudo systemctl start mariadb` | - | Database |
| 2 | `sudo systemctl start redis-server` | - | Redis |
| 3 | `npm run dev` | `iCar/` | Next.js app (port 3000) |
| 4 | `source .venv/bin/activate && python app.py` | `scrapper/` | Scraper API (port 8000) |
| 5 | `npm run worker` | `iCar/` | Alert worker + Bull Board (port 3001) |
| 6 | (optional) Add cron entry | - | Push alert jobs every 5 min |

---

## 10. Verify everything

1. **App:** http://localhost:3000 — login/signup (admin + dealer).
2. **Scraper:** http://localhost:8000 — should return the API root or docs.
3. **Bull Board:** http://localhost:3001/admin/queues — queue dashboard.
4. **Health:** http://localhost:3001/health — `{"status":"ok","worker":"running"}`.

---

## 11. Gmail SMTP (App Password)

If using Gmail for emails (approval, alerts):

1. Enable 2FA on your Google account.
2. Go to Google Account → Security → 2-Step Verification → App passwords.
3. Create an app password for "Mail" and use it as `SMTP_PASS` in `.env`.

---

## 12. Troubleshooting

| Issue | Check |
|-------|--------|
| `DATABASE_URL` / Prisma errors | DB running, user has access, `npx prisma generate` and `migrate deploy` run. |
| Redis connection refused | `redis-server` running, `REDIS_URL=redis://127.0.0.1:6379`. |
| Scraper timeout in alerts | Scraper running on port 8000; worker has 120s timeout. |
| Cron not running | Use absolute paths in crontab; check `logs/cron-push.log`. |
| Images not loading | Ensure `public/uploads` exists; listing images are under `public/uploads/listings/`. |

---

## 13. Project structure reference

```
iCar/
├── iCar/                    # Next.js app
│   ├── .env                 # Your env (create from example)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── app/             # Routes, API, pages
│   │   ├── lib/             # db, mail, queue, alert-worker
│   │   └── scripts/         # cron-push-alerts, start-worker
│   ├── logs/                # alert-worker.log, cron-push.log
│   └── package.json
│
├── scrapper/                # Python FastAPI scraper
│   ├── .venv/               # Python venv
│   ├── app.py               # Entry: uvicorn port 8000
│   ├── requirements.txt
│   └── ...
│
└── SETUP.md                 # This file
```

You’re done. Use the steps above to get the whole project running on another laptop.
