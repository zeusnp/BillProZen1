import os
import sys
import subprocess
import platform
import traceback

def run_command(command):
    """Run a command and return its output"""
    print(f"Running: {command}")
    try:
        result = subprocess.run(command, shell=True, check=True, 
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               universal_newlines=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        print(f"Error output: {e.stderr}")
        return None

def setup_environment():
    """Set up the Python environment with required packages"""
    print("Setting up BillProZen environment...")
    
    # Check if pip is available
    if run_command("pip --version") is None:
        print("Error: pip is not installed or not in PATH")
        return False
    
    # Install required packages
    print("\nInstalling required packages...")
    result = run_command("pip install -r requirements.txt")
    if result is None:
        print("Error installing required packages")
        return False
    
    print("Required packages installed successfully!")
    return True

def initialize_database_directly():
    """Initialize the database directly without importing fix_db"""
    try:
        print("Initializing database directly...")
        
        # Import Flask and create app
        from flask import Flask
        from config import Config
        
        app = Flask(__name__)
        app.config.from_object(Config)
        
        # Import models after app is created
        from models import db, Party, Invoice, LineItem, Expense
        from datetime import datetime
        
        # Initialize the app with the database
        db.init_app(app)
        
        with app.app_context():
            # Drop all tables and recreate
            db.drop_all()
            db.create_all()
            
            print("Database tables recreated successfully!")
            
            # Add sample parties
            buyer1 = Party(
                name="Sharma Transport", 
                contact_person="Ramesh Sharma", 
                phone="9876543210", 
                email="sharma@example.com", 
                address="123 Main St, Delhi", 
                gst_number="GSTIN1234567890", 
                outstanding_balance=0, 
                party_type="buyer"
            )
            
            buyer2 = Party(
                name="Singh Logistics", 
                contact_person="Harpreet Singh", 
                phone="8765432109", 
                email="singh@example.com", 
                address="456 Park Ave, Mumbai", 
                gst_number="GSTIN0987654321", 
                outstanding_balance=0, 
                party_type="buyer"
            )
            
            seller1 = Party(
                name="Patel Enterprises", 
                contact_person="Nikhil Patel", 
                phone="7654321098", 
                email="patel@example.com", 
                address="789 Lake Rd, Ahmedabad", 
                gst_number="GSTIN2345678901", 
                outstanding_balance=0, 
                party_type="seller"
            )
            
            db.session.add(buyer1)
            db.session.add(buyer2)
            db.session.add(seller1)
            
            # Commit to get IDs
            db.session.commit()
            print(f"Added sample parties")
            
            # Create a sample invoice
            invoice_date = datetime.now()
            invoice = Invoice(
                invoice_number="23-06-0001",
                date=invoice_date,
                party_id=buyer1.id,
                vehicle_number="DL01AB1234",
                total_amount=15000,
                pakka_party_id=seller1.id,
                pakka_amount=10000,
                kaccha_amount=5000
            )
            
            db.session.add(invoice)
            # Commit to get invoice ID
            db.session.commit()
            
            # Add line items
            line_item1 = LineItem(
                invoice_id=invoice.id,
                description="Transportation Services",
                quantity=1,
                rate=10000,
                amount=10000
            )
            
            line_item2 = LineItem(
                invoice_id=invoice.id,
                description="Loading",
                quantity=1,
                rate=2000,
                amount=2000
            )
            
            db.session.add(line_item1)
            db.session.add(line_item2)
            
            # Add expenses
            expense = Expense(
                invoice_id=invoice.id,
                expense_type="Toll",
                amount=3000
            )
            
            db.session.add(expense)
            
            # Final commit
            db.session.commit()
            print("Added sample invoice with line items and expenses")
            
            print("Database initialization complete!")
        
        return True
    except Exception as e:
        print(f"Error initializing database: {e}")
        print("Detailed error:")
        traceback.print_exc()
        return False

def main():
    """Main setup function"""
    print("=" * 60)
    print("BillProZen Setup Utility")
    print("=" * 60)
    
    # Setup environment
    if not setup_environment():
        print("Environment setup failed. Please check the errors above.")
        return
    
    # Initialize database directly
    if not initialize_database_directly():
        print("Database initialization failed. Please check the errors above.")
        return
    
    print("\n" + "=" * 60)
    print("Setup completed successfully!")
    print("\nYou can now run the application with:")
    print("  python main.py")
    print("=" * 60)

if __name__ == "__main__":
    main()
