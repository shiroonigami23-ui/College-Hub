# Customization Guide

## 1. Branding
- Update title and description in `apps/web/app/layout.tsx`
- Update hero copy in `apps/web/app/page.tsx`

## 2. Data
- Edit `services/api/app/data.py`
- Replace sample URLs with your institutional links

## 3. Modules
- Add more API routes in `services/api/app/main.py`
- Add new frontend sections in `apps/web/components/`

## 4. Deployment
- Frontend can be deployed on Vercel
- Backend can be deployed on Render/Fly/Railway

## 5. Security and Auth
- Add auth middleware in FastAPI
- Add Next.js auth/session provider (e.g., NextAuth)
