# Data Quality Analysis and Management Platform

Internship project based on the provided requirements document.

## Features

- User authentication with JWT
- CSV dataset upload
- Data quality score
- Missing value report
- Duplicate record detection
- Validation report
- Dashboard analytics
- Data cleaning
- CSV and JSON export
- PostgreSQL/Supabase-ready backend configuration

## Project Structure

```text
backend/
  app/
    main.py
    database.py
    models.py
    schemas.py
    auth.py
    quality.py
    routers/
  requirements.txt
  .env.example
frontend/
  src/
    App.jsx
    api.js
    styles.css
  package.json
database/
  schema.sql
sample_data/
  customers.csv
```

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Backend URL: `http://127.0.0.1:8010`

API docs: `http://127.0.0.1:8010/docs`

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

If Windows shows `[WinError 10013]`, keep using backend port `8010` instead of `8000`.

If Uvicorn reloads because of files inside `.venv`, do not use `--reload`. For a stable demo, use the command above or double-click `start_backend.bat`.

## Supabase/PostgreSQL Setup

1. Create a Supabase project.
2. Copy your database connection string.
3. Put it in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:password@host:5432/postgres
```

4. Run the backend. Tables are created automatically.

## Demo Login

Register a user from the frontend, then login and upload `sample_data/customers.csv`.
