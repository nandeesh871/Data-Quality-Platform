from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, field_serializer


class TimezonedModel(BaseModel):
    @field_serializer("created_at")
    def serialize_datetime(self, dt: datetime, _info):
        if dt.tzinfo is None:
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        return dt.isoformat()


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DatasetOut(TimezonedModel):
    id: int
    filename: str
    rows_count: int
    columns_count: int
    quality_score: float
    status: str
    created_at: datetime
    owner_id: int
    owner_name: str | None = None

    class Config:
        from_attributes = True


class UserRoleUpdate(BaseModel):
    role: str



class UserOut(TimezonedModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class LineageLogOut(TimezonedModel):
    id: int
    dataset_id: int
    user_id: int
    user_name: str | None = None
    dataset_filename: str | None = None
    action: str
    details: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisOut(BaseModel):
    dataset: DatasetOut
    analysis: dict[str, Any]
    lineage_logs: list[LineageLogOut] = []


class AdminSummary(BaseModel):
    total_users: int
    total_datasets: int
    average_quality_score: float
    cleaned_datasets: int
    preprocessed_datasets: int
    trained_datasets: int
    total_rows: int
    total_columns: int
    status_counts: dict[str, int]
    project_modules: list[str]
    workflow_steps: list[str]
    recent_users: list[UserOut]
    recent_datasets: list[DatasetOut]
    low_quality_datasets: list[DatasetOut]
    recent_activities: list[LineageLogOut]


class UserUpdate(BaseModel):
    name: str
    email: EmailStr


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    action: str  # "login" or "reset"


class OTPLoginVerify(BaseModel):
    email: EmailStr
    otp: str


class OTPResetVerify(BaseModel):
    email: EmailStr
    otp: str
    new_password: str



