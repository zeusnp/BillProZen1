import sqlite3

# Connect to the database
conn = sqlite3.connect('billprozen.db')
cursor = conn.cursor()

# Check if the column already exists
cursor.execute("PRAGMA table_info(transactions)")
columns = cursor.fetchall()
column_names = [column[1] for column in columns]

# Add the payment_type column if it doesn't exist
if 'payment_type' not in column_names:
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'kaccha'")
        print("Successfully added payment_type column to transactions table")
    except sqlite3.Error as e:
        print(f"Error adding column: {e}")
else:
    print("Column 'payment_type' already exists in transactions table")

# Commit changes and close connection
conn.commit()
conn.close()
