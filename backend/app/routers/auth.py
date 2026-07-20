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


def send_welcome_email(to_email: str, name: str) -> tuple[bool, str]:
    import smtplib, ssl
    from email.message import EmailMessage
    from datetime import datetime

    host = settings.smtp_host or "smtp.gmail.com"
    port = settings.smtp_port or 587
    user = settings.smtp_user
    password = settings.smtp_password
    sender = settings.smtp_from or user

    if user:
        user = user.strip().strip('"').strip("'")
    if password:
        password = password.strip().strip('"').strip("'").replace(" ", "")

    if not user or not password or "your-sending-gmail" in user or "your-google-app-password" in password:
        print("SMTP credentials missing for welcome email. Skipping real email dispatch.")
        return False, "SMTP not configured"

    try:
        msg = EmailMessage()
        msg["Subject"] = "Welcome to Data Quality Hub - Account Created Successfully"
        msg["From"] = sender
        msg["To"] = to_email

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="text-align: center; border-bottom: 2px solid #14b8a6; padding-bottom: 15px; margin-bottom: 25px;">
                        <h2 style="color: #0d9488; margin: 0; font-size: 24px; font-weight: bold;">Data Quality Hub</h2>
                        <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Account Confirmation</p>
                    </div>
                    <p style="font-size: 16px; color: #1e293b;">Hello <strong>{name}</strong>,</p>
                    <p style="font-size: 16px; color: #1e293b;">Welcome to <strong>Data Quality Hub</strong>! Your enterprise account has been created successfully.</p>
                    <div style="background-color: #f0fdf4; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0; color: #166534;">
                        <p style="margin: 0; font-weight: 600;">Account Details:</p>
                        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                            <li>Email: <strong>{to_email}</strong></li>
                            <li>Registered: <strong>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</strong></li>
                        </ul>
                    </div>
                    <p style="color: #475569; font-size: 14px;">You can now log in, upload CSV datasets, run automated quality audits, clean missing values, and train machine learning models.</p>
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center; margin-top: 25px;">
                        <p style="margin: 0;">&copy; {datetime.now().year} Data Quality Platform Team</p>
                    </div>
                </div>
            </body>
        </html>
        """
        msg.set_content(f"Welcome to Data Quality Hub, {name}! Your account ({to_email}) has been created successfully.")
        msg.add_alternative(html_body, subtype="html")

        context = ssl.create_default_context()
        if int(port) == 465:
            with smtplib.SMTP_SSL(host, int(port), context=context, timeout=15) as server:
                server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, int(port), timeout=15) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(user, password)
                server.send_message(msg)

        print(f"Successfully sent welcome confirmation email to {to_email}.")
        return True, "sent"
    except Exception as err:
        print(f"Welcome email dispatch error: {err}")
        return False, str(err)


@router.post("/test-smtp")
def test_smtp_configuration(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    success, msg = send_welcome_email(current_user.email, current_user.name)
    if success:
        return {"status": "success", "message": "SMTP configuration works correctly."}
    else:
        raise HTTPException(status_code=400, detail=f"SMTP check failed: {msg}")


def send_otp_email(to_email: str, otp: str, purpose: str) -> tuple[bool, str]:
    import smtplib, ssl
    from email.message import EmailMessage
    from datetime import datetime

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
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Email: {to_email} | OTP: {otp} | Purpose: {purpose}\n")
    except Exception as log_err:
        print(f"Failed to log OTP to file: {log_err}")

    print("\n" + "="*50)
    print(f"  OTP CODE FOR {to_email}: {otp} (Purpose: {purpose})")
    print("="*50 + "\n")

    # 2. Check if SMTP configuration is set
    host = settings.smtp_host or "smtp.gmail.com"
    port = settings.smtp_port or 587
    user = settings.smtp_user
    password = settings.smtp_password
    sender = settings.smtp_from or user

    if user:
        user = user.strip().strip('"').strip("'")
    if password:
        password = password.strip().strip('"').strip("'").replace(" ", "")

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
        msg = EmailMessage()
        msg["Subject"] = f"Your OTP Verification Code: {otp}"
        msg["From"] = sender
        msg["To"] = to_email

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 25px;">
                        <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: bold;">Data Quality Hub</h2>
                        <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">OTP Verification Service</p>
                    </div>
                    <p style="font-size: 16px; color: #1e293b;">Hello,</p>
                    <p style="font-size: 16px; color: #1e293b;">You requested a verification code to perform the following action: <strong>{purpose}</strong>.</p>
                    <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 1px dashed #cbd5e1;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #4f46e5;">{otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 25px;">This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
                        <p style="margin: 0;">This is an automated security transmission. Please do not reply.</p>
                        <p style="margin: 5px 0 0 0;">&copy; {datetime.now().year} Data Quality Platform Team</p>
                    </div>
                </div>
            </body>
        </html>
        """
        msg.set_content(f"Your OTP is {otp} to perform {purpose}.")
        msg.add_alternative(html_body, subtype="html")

        # Setup SMTP server
        context = ssl.create_default_context()
        if int(port) == 465:
            with smtplib.SMTP_SSL(host, int(port), context=context, timeout=15) as server:
                server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, int(port), timeout=15) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(user, password)
                server.send_message(msg)

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

    if not success or status == "simulated":
        print(f"SMTP dispatch note: {status}. OTP code logged to server output.")
        try:
            with open("otp_code.txt", "a", encoding="utf-8") as f:
                f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Email: {user.email} | OTP: {otp} | Action: {purpose}\n")
        except Exception:
            pass

    return {
        "message": f"Verification code sent to {payload.email}. Please check your inbox to verify.",
        "demo_otp": otp if status != "sent" else None
    }


@router.post("/forgot-password/verify-login", response_model=Token)
def verify_otp_login(payload: OTPLoginVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.otp_code or user.otp_code != payload.otp:
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
