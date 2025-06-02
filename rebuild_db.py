import os
import sqlite3
from flask import Flask
from models import db, Party

# Create a simple Flask app just for database operations
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///billprozen.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def rebuild_database():
    """Completely rebuild the database from scratch"""
    with app.app_context():
        # Find the database file
        db_path = 'billprozen.db'  # Hardcoded for simplicity
        print(f"Looking for database at: {os.path.abspath(db_path)}")
        
        # Delete the database file if it exists
        if os.path.exists(db_path):
            print(f"Deleting existing database file: {db_path}")
            os.remove(db_path)
            print("Database file deleted.")
        else:
            print("No existing database file found.")
        
        # Create all tables
        print("Creating new database tables...")
        db.create_all()
        print("Database tables created successfully!")
        
        # Add sample data
        print("Adding sample party data...")
        sample_parties = [
            Party(
                name="Acme Corp",
                party_type="buyer",
                contact_person="John Doe",
                phone="123-456-7890",
                email="john@acmecorp.com",
                address="123 Business Ave, New York, NY 10001",
                gst_number="GST123456789",
                outstanding_balance=15000.00
            ),
            Party(
                name="Global Innovations",
                party_type="seller",
                contact_person="Jane Smith",
                phone="987-654-3210",
                email="jane@globalinnovations.com",
                address="456 Tech Park, San Francisco, CA 94105",
                gst_number="GST987654321",
                outstanding_balance=8500.00
            ),
            Party(
                name="Tech Solutions",
                party_type="buyer",
                contact_person="Robert Johnson",
                phone="555-123-4567",
                email="robert@techsolutions.com",
                address="789 Innovation Drive, Austin, TX 78701",
                gst_number="GST555123456",
                outstanding_balance=12000.00
            )
        ]
        
        # Add all parties to the session
        for party in sample_parties:
            db.session.add(party)
        
        # Commit the changes
        db.session.commit()
        print(f"Added {len(sample_parties)} sample parties to the database.")
        
        # Verify the database structure
        print("\nVerifying database structure:")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(parties)")
        columns = cursor.fetchall()
        print("Parties table columns:")
        for column in columns:
            print(f"  - {column[1]} ({column[2]})")
        conn.close()
        
        print("\nDatabase rebuild completed successfully!")

if __name__ == "__main__":
    rebuild_database()
