# Sweety – Blood Glucose Tracker

A small web app where a diabetes patient records up to 4 blood glucose readings a day and views daily, month-to-date and monthly reports.

**Stack:** Node.js + Express API · PostgreSQL · React (Vite)

## Prerequisites

- Node.js 20+
- Docker Desktop (runs PostgreSQL), or a local PostgreSQL 14+

## Setup

```bash
# 1. Start PostgreSQL (creates the sweety and sweety_test databases)
docker compose up -d

# 2. API
cd server
cp .env.example .env
npm install
npm run migrate
npm run dev         # http://localhost:4000

# 3. Frontend (new terminal)
cd client
cp .env.example .env
npm install
npm run dev         # http://localhost:5173
```

## Running tests

```bash
cd server
npm test
```
