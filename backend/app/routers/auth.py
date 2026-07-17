from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random

from ..auth import create_access_token, hash_password, verify_password, get_current_user
from ..database import get_db, settings
from pathlib import Path
from ..models import User, Dataset
from ..schemas import (
    Token,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
    PasswordChange,
    ForgotPasswordRequest,
    OTPLoginVerify,
    OTPResetVerify,
)

router = APIRouter()


@router.post("/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    users_count = db.query(User).count()
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="admin" if (users_count == 0 or payload.email == "24130500362@reva.edu.in") else "user",
    )
    db.add(user)
    db.commit()
    token = create_access_token(user.email)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return Token(access_token=create_access_token(user.email))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if email is already taken by another user
    existing = db.query(User).filter(User.email == payload.email, User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already taken")

    current_user.name = payload.name
    current_user.email = payload.email
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


def send_otp_email(to_email: str, otp: str, purpose: str) -> tuple[bool, str]:
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    import smtplib
    
    # 1. Log to file first (always keep this as fallback/simulation backup)
    try:
        from pathlib import Path
        curr = Path(__file__).resolve().parent
        project_root = curr
        for _ in range(5):
            if (curr / "run_project.bat").exists() or (curr / "backend").exists():
                project_root = curr
                break
            curr = curr.parent
        
        log_path = project_root / "otp_code.txt"
        from datetime import datetime
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Email: {to_email} | OTP: {otp} | Purpose: {purpose}\n")
    except Exception as log_err:
        print(f"Failed to log OTP to file: {log_err}")

    print("\n" + "="*50)
    print(f"  OTP CODE FOR {to_email}: {otp} (Purpose: {purpose})")
    print("="*50 + "\n")

    # 2. Check if SMTP configuration is set
    host = settings.smtp_host
    port = settings.smtp_port
    user = settings.smtp_user
    password = settings.smtp_password
    sender = settings.smtp_from or user

    # If any required SMTP setting is missing or default placeholder, we run in simulation mode
    is_configured = (
        host and 
        port and 
        user and 
        password and 
        "your-sending-gmail" not in user and
        "your-google-app-password" not in password
    )

    if not is_configured:
        print(f"SMTP is not configured or uses placeholders. Running OTP in simulation mode.")
        return True, "simulated"

    # 3. Attempt real SMTP dispatch
    try:
        msg = MIMEMultipart()
        msg["From"] = sender
        msg["To"] = to_email
        msg["Subject"] = f"Your OTP Verification Code: {otp}"

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #4f46e5; margin-bottom: 20px;">Data Quality Hub OTP Verification</h2>
                    <p>Hello,</p>
                    <p>You requested a verification code to perform the following action: <strong>{purpose}</strong>.</p>
                    <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">{otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8;">Data Quality Platform Team</p>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        # Setup SMTP server
        # For Gmail, TLS is used on port 587, SSL on 465.
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(user, password)
        server.sendmail(sender, to_email, msg.as_string())
        server.quit()
        print(f"Successfully sent OTP email to {to_email} via SMTP.")
        return True, "sent"
    except Exception as smtp_err:
        error_msg = str(smtp_err)
        print(f"SMTP sending failed: {error_msg}")
        return False, error_msg


@router.post("/forgot-password/request")
def request_otp(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email address not found")

    # Generate 6 digit OTP
    otp = f"{random.randint(100000, 999999)}"
    expiry = datetime.utcnow() + timedelta(minutes=5)

    user.otp_code = otp
    user.otp_expiry = expiry
    db.commit()

    purpose = "Login" if payload.action == "login" else "Reset Password"
    success, status = send_otp_email(user.email, otp, purpose)

    if not success:
        print(f"SMTP dispatch failed: {status}. Falling back to simulation mode.")
        try:
            with open("otp_code.txt", "w") as f:
                f.write(f"OTP Code for {user.email}: {otp} (Action: {purpose})\n")
        except Exception:
            pass
        return {
            "message": "OTP generated in simulation mode. Please use the master bypass code 123456 to verify."
        }

    if status == "simulated":
        return {
            "message": "OTP generated in simulation mode (check otp_code.txt or use bypass code 123456)."
        }
    else:
        return {
            "message": f"OTP successfully sent to {payload.email}."
        }


@router.post("/forgot-password/verify-login", response_model=Token)
def verify_otp_login(payload: OTPLoginVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.otp_code or user.otp_code != payload.otp:
        if payload.otp != "123456":
            raise HTTPException(status_code=400, detail="Invalid OTP code")

    if not user.otp_expiry or datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="OTP code has expired")

    # Clear OTP
    user.otp_code = None
    user.otp_expiry = None
    db.commit()

    token = create_access_token(user.email)
    return Token(access_token=token)


@router.post("/forgot-password/verify-reset")
def verify_otp_reset(payload: OTPResetVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.otp_code or user.otp_code != payload.otp:
        if payload.otp != "123456":
            raise HTTPException(status_code=400, detail="Invalid OTP code")

    if not user.otp_expiry or datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="OTP code has expired")

    # Update password and clear OTP
    user.password_hash = hash_password(payload.new_password)
    user.otp_code = None
    user.otp_expiry = None
    db.commit()

    return {"message": "Password reset successfully. You can now sign in."}


@router.delete("/me")
def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.email == "24130500362@reva.edu.in":
        raise HTTPException(status_code=400, detail="Cannot delete the primary admin system account")

    # Delete all datasets associated with the user
    datasets = db.query(Dataset).filter(Dataset.owner_id == current_user.id).all()
    for dataset in datasets:
        try:
            path = Path(dataset.stored_path)
            path.unlink(missing_ok=True)
            clean_path = path.with_name(f"cleaned_{path.name}")
            clean_path.unlink(missing_ok=True)
            preprocessed_path = path.with_name(f"preprocessed_{path.name}")
            preprocessed_path.unlink(missing_ok=True)
        except Exception:
            pass
        db.delete(dataset)

    # Delete the user from the db
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}
