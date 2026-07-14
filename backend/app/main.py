from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .database import Base, engine, settings
from . import models
from .routers import admin, auth, datasets

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
Base.metadata.create_all(bind=engine)


def ensure_database_columns():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "role" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'"))
    if "otp_code" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN otp_code VARCHAR(10) NULL"))
    if "otp_expiry" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN otp_expiry DATETIME NULL"))
    with engine.begin() as connection:
        # Fallback to make the first user admin if there are no admins
        admin_count = connection.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'")).scalar()
        if admin_count == 0:
            first_user = connection.execute(text("SELECT id FROM users ORDER BY id LIMIT 1")).scalar()
            if first_user:
                connection.execute(text("UPDATE users SET role = 'admin' WHERE id = :id"), {"id": first_user})


ensure_database_columns()

app = FastAPI(
    title="Data Quality Analysis and Management Platform",
    description="Upload, validate, analyze, clean, manage, visualize, and export datasets.",
    version="1.0.0",
)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/")
def health_check():
    return {"message": "Data Quality Analysis API is running"}
