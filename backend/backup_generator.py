import os
import json
from sqlalchemy.orm import Session
from db import SessionLocal, OptionChain, PublicTrade

# Path to frontend/public
FRONTEND_PUBLIC = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")

def to_dict(obj):
    """Convert SQLAlchemy model instance to dict (JSON serializable)."""
    result = {}
    for column in obj.__table__.columns:
        value = getattr(obj, column.name)
        # Convert date/datetime to ISO string
        if hasattr(value, "isoformat"):
            value = value.isoformat()
        result[column.name] = value
    return result

def export_table_to_json(session: Session, model, output_filename: str):
    """Export a SQLAlchemy model (table) to JSON file, fully replacing old file."""
    output_path = os.path.join(FRONTEND_PUBLIC, output_filename)
    os.makedirs(FRONTEND_PUBLIC, exist_ok=True)

    try:
        data = []
        # Use yield_per to fetch in chunks for large tables
        for row in session.query(model).yield_per(5000):
            data.append(to_dict(row))

        # Overwrite existing JSON completely
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"✅ Exported {model.__tablename__} -> {output_path} ({len(data)} records)")
    except Exception as e:
        print(f"❌ Error exporting {model.__tablename__}: {e}")

def generate_backups():
    """Generate backup JSON files for frontend fallback."""
    session = SessionLocal()
    try:
        export_table_to_json(session, PublicTrade, "trades_backup.json")
        export_table_to_json(session, OptionChain, "chains_backup.json")
    finally:
        session.close()

if __name__ == "__main__":
    generate_backups()
