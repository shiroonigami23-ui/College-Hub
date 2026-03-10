# College Hub Template

A production-ready **Next.js + FastAPI** starter for college portals.

This template gives you a clean baseline for:
- campus announcements
- events calendar and registration links
- academic resources repository
- club directory and student info blocks

## Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** FastAPI, Pydantic, Uvicorn
- **Dev DX:** GitHub Actions CI, script-based packaging

## Monorepo Layout
- `apps/web` -> Next.js UI
- `services/api` -> FastAPI backend
- `.github/workflows` -> CI pipeline
- `scripts/package.ps1` -> source package generator

## Quick Start
### 1) Backend
```bash
cd services/api
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend
```bash
cd apps/web
npm install
npm run dev
```

### 3) Open
- Web: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`

## Environment
- Copy `apps/web/.env.example` to `apps/web/.env.local`
- Optional: set `NEXT_PUBLIC_API_BASE_URL`

## Customization Guide
1. Edit `services/api/app/data.py` with your college-specific seed data.
2. Update cards/sections in `apps/web/app/page.tsx`.
3. Rename branding in `apps/web/app/layout.tsx`.
4. Add auth/DB integrations as needed.

## CI
GitHub Actions validates:
- API import + tests
- Frontend build

## Packaging
```powershell
./scripts/package.ps1 -Version 1.0.0
```
Creates `dist/college-hub-template-v1.0.0.zip`.
