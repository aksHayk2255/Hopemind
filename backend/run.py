import os
from app import create_app, db

app = create_app(os.environ.get("FLASK_ENV", "development"))

if __name__ == "__main__":
    with app.app_context():
        # Ensure database tables exist
        db.create_all()
        print("[HopeMind] Database initialized.")
        
    port = int(os.environ.get("PORT", 5000))
    print(f"[HopeMind Backend] Server starting at http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
