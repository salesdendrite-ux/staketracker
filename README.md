# StakeTracker

Stakeholder intelligence platform — track org chart changes across your target companies.

## Architecture

- **Backend:** Node.js + Express, PostgreSQL (Railway), JWT auth
- **Frontend:** React 18 + Vite + TailwindCSS
- **Scraping:** Puppeteer (TheOrg), Puppeteer Extra + Stealth (LinkedIn)
- **Scheduling:** node-cron (serial job queue)
- **Export:** ExcelJS (.xlsx with formatting)

## Repository Structure

```
/server              Express backend
  /src
    /routes          auth, companies, stakeholders, changelog, scrape, export
    /middleware      JWT auth, input validation
    /services        scraper, diffEngine, scheduler, exporter
    /db              pool, migrations, seeds
    /utils           logger, constants
/client              React frontend (Vite)
  /src
    /pages           Login, Register, Dashboard, CompanyDetail, GlobalChangelog
    /components      Layout, StakeholderTable, StatusBadge, ChangeLogFeed,
                     CompanyCard, AddCompanyModal, AddStakeholderModal,
                     ScrapeButton, ExportButton
    /services        api.js (axios + JWT interceptor)
    /context         AuthContext
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (or Railway Postgres)

### 1. Clone and install

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Environment variables

```bash
cp .env.example server/.env
```

Edit `server/.env`:

| Variable           | Description                        |
|--------------------|------------------------------------|
| DATABASE_URL       | PostgreSQL connection string       |
| JWT_SECRET         | Random 64-char secret              |
| PORT               | Express port (default: 3001)       |
| NODE_ENV           | development / production           |
| LINKEDIN_COOKIE    | LinkedIn li_at session cookie      |
| SCRAPE_CONCURRENCY | Max concurrent jobs (default: 1)   |
| CLIENT_URL         | Frontend URL for CORS              |

### 3. Run migrations

```bash
cd server
node src/db/migrate.js
```

### 4. Seed test data (optional)

```bash
node src/db/seeds/seed.js
```

Creates: admin user (`admin@staketracker.com` / `admin123`), 3 test companies with stakeholders and change log entries.

### 5. Start development

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Key Features

### Authentication
- Register / Login with JWT (7-day expiry)
- Role-based access (admin, member)

### Companies
- CRUD company folders with LinkedIn and TheOrg URLs
- Configurable scrape frequency (daily/weekly/biweekly/monthly)
- Pause/resume scraping per company

### Stakeholders
- Manual add/edit/soft-delete (marks inactive, never hard-deletes)
- Status: active (green), new (blue), inactive (red)
- "New" badge auto-expires after 90 days
- Sortable/filterable table with pagination

### Scraping & Diff Engine
- TheOrg scraper (Puppeteer, primary source)
- LinkedIn scraper (Puppeteer + stealth, session cookies, CAPTCHA detection)
- Diff engine detects: new stakeholders, title changes, reports-to changes, departures, returns
- Consecutive misses rule: inactive only after 2 consecutive scrape misses
- 3 retries with exponential backoff on LinkedIn failures

### Scheduling
- node-cron polls every 60s for due companies
- Serial job queue (one at a time for memory management)
- Automatic next_scrape_at computation

### Change Log
- Per-company and global views
- Filter by change type, company, date range
- Paginated results

### Excel Export
- Per-company: 2 sheets (Stakeholders + Change Log)
- Global: 1 sheet per company + All Changes sheet
- Formatted headers, status coloring, LinkedIn hyperlinks, auto-width

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/companies | List companies |
| POST | /api/companies | Create company |
| GET | /api/companies/:id | Company detail + stats |
| PUT | /api/companies/:id | Update company |
| DELETE | /api/companies/:id | Delete (admin only) |
| GET | /api/companies/:id/stakeholders | List stakeholders |
| POST | /api/companies/:id/stakeholders | Add stakeholder |
| PUT | /api/companies/:id/stakeholders/:sid | Update stakeholder |
| DELETE | /api/companies/:id/stakeholders/:sid | Soft-delete |
| GET | /api/companies/:id/changelog | Company changelog |
| GET | /api/changelog | Global changelog |
| POST | /api/companies/:id/scrape | Trigger scrape |
| GET | /api/companies/:id/scrape-jobs | Scrape history |
| GET | /api/scrape-jobs/:jobId | Job detail |
| GET | /api/companies/:id/export | Export company xlsx |
| GET | /api/export/all | Export all xlsx |

## Acceptance Criteria

### Phase 1 — Foundation ✅
- [x] Auth (register, login, protected routes)
- [x] Company CRUD
- [x] Stakeholder CRUD with soft-delete
- [x] Sortable/filterable stakeholder table
- [x] Status badges (green/blue/red)
- [x] Change log on manual edits
- [x] Per-company Excel export
- [x] Proper error responses
- [x] Idempotent migrations
- [x] 90-day new badge expiry

### Phase 2 — Scraping Engine ✅
- [x] TheOrg scraper
- [x] LinkedIn scraper with stealth + retry
- [x] Diff engine (5 change types)
- [x] Change log with old/new values
- [x] Scrape Now button with loading + toast
- [x] Error handling + retry logic

### Phase 3 — Scheduling & Intelligence ✅
- [x] Scheduler with company-defined frequencies
- [x] Scrape job history in UI
- [x] Global change log with filters
- [x] Global export (multi-sheet)
- [x] Pause/resume scraping per company
