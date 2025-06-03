import sqlite3
import os

def add_related_party_column():
    """
    Add related_party_id column to the transactions table in the SQLite database
    """
    try:
        # Connect to the database
        conn = sqlite3.connect('billprozen.db')
        cursor = conn.cursor()
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(transactions)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'related_party_id' not in columns:
            # Add the new column
            cursor.execute("ALTER TABLE transactions ADD COLUMN related_party_id INTEGER")
            
            # Add foreign key constraint - SQLite doesn't support adding constraints after table creation
            # But we can ensure data integrity at the application level
            
            print("Successfully added related_party_id column to transactions table")
        else:
            print("Column related_party_id already exists in transactions table")
            
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        print(f"Error adding column: {str(e)}")
        return False

if __name__ == "__main__":
    add_related_party_column()
