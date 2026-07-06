from backend.app.database import SessionLocal
from backend.app.models import User
from backend.app.routers.admin import admin_summary
from backend.app.routers.datasets import user_summary, get_download_history

db = SessionLocal()

try:
    # Get the admin user
    admin_user = db.query(User).filter(User.id == 1).first()
    print("Testing admin_summary...")
    summary = admin_summary(admin=admin_user, db=db)
    print("Admin summary result keys:", summary.keys())
    print("Recent activities length:", len(summary["recent_activities"]))
except Exception as e:
    print("Admin summary FAILED:", e)
    import traceback
    traceback.print_exc()

try:
    # Get standard user
    std_user = db.query(User).filter(User.id == 2).first()
    print("\nTesting user_summary for samba...")
    summary = user_summary(user=std_user, db=db)
    print("User summary result keys:", summary.keys())
    print("Recent activity length:", len(summary["recent_activity"]))
except Exception as e:
    print("User summary FAILED:", e)
    import traceback
    traceback.print_exc()

try:
    print("\nTesting get_download_history for samba...")
    history = get_download_history(user=std_user, db=db)
    print("Download history result:", history)
except Exception as e:
    print("Download history FAILED:", e)
    import traceback
    traceback.print_exc()

db.close()
