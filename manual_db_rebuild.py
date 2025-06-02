import os
import sqlite3
from datetime import datetime

def rebuild_database_manually():
    """Rebuild the database using direct SQL commands"""
    # Database file path
    db_path = 'billprozen.db'
    
    # Delete existing database if it exists
    if os.path.exists(db_path):
        print(f"Deleting existing database file: {db_path}")
        os.remove(db_path)
        print("Database file deleted.")
    
    # Connect to SQLite (this will create a new database file)
    print(f"Creating new database at: {os.path.abspath(db_path)}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create parties table with party_type column
    print("Creating parties table with party_type column...")
    cursor.execute('''
    CREATE TABLE parties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        party_type VARCHAR(20) NOT NULL DEFAULT 'buyer',
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        gst_number VARCHAR(20),
        outstanding_balance FLOAT DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Insert sample data
    print("Adding sample party data...")
    current_time = datetime.utcnow().isoformat()
    sample_parties = [
        ('Acme Corp', 'buyer', 'John Doe', '123-456-7890', 'john@acmecorp.com', 
         '123 Business Ave, New York, NY 10001', 'GST123456789', 15000.00, current_time, current_time),
        ('Global Innovations', 'seller', 'Jane Smith', '987-654-3210', 'jane@globalinnovations.com', 
         '456 Tech Park, San Francisco, CA 94105', 'GST987654321', 8500.00, current_time, current_time),
        ('Tech Solutions', 'buyer', 'Robert Johnson', '555-123-4567', 'robert@techsolutions.com', 
         '789 Innovation Drive, Austin, TX 78701', 'GST555123456', 12000.00, current_time, current_time)
    ]
    
    cursor.executemany('''
    INSERT INTO parties (name, party_type, contact_person, phone, email, address, gst_number, outstanding_balance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', sample_parties)
    
    # Commit changes and close connection
    conn.commit()
    
    # Verify the table structure
    print("\nVerifying database structure:")
    cursor.execute("PRAGMA table_info(parties)")
    columns = cursor.fetchall()
    print("Parties table columns:")
    for column in columns:
        print(f"  - {column[1]} ({column[2]})")
    
    # Verify the data
    print("\nVerifying sample data:")
    cursor.execute("SELECT id, name, party_type FROM parties")
    parties = cursor.fetchall()
    for party in parties:
        print(f"  - ID: {party[0]}, Name: {party[1]}, Type: {party[2]}")
    
    # Close connection
    conn.close()
    print("\nDatabase rebuild completed successfully!")

if __name__ == "__main__":
    rebuild_database_manually()
