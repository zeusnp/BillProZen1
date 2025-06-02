import os
import sys
from flask import Flask
from config import Config
from datetime import datetime, timedelta
import random

app = Flask(__name__)
app.config.from_object(Config)

# Import db after app is created
from models import db, Party, Invoice, LineItem, Expense

# Initialize the app with the database
db.init_app(app)

def fix_database():
    with app.app_context():
        print("Fixing database...")
        
        # Drop all tables and recreate
        db.drop_all()
        db.create_all()
        
        print("Database tables recreated successfully!")
        
        # Add sample parties
        parties = [
            Party(name="Sharma Transport", contact_person="Ramesh Sharma", 
                  phone="9876543210", email="sharma@example.com", 
                  address="123 Main St, Delhi", gst_number="GSTIN1234567890", 
                  outstanding_balance=0, party_type="buyer"),
            
            Party(name="Singh Logistics", contact_person="Harpreet Singh", 
                  phone="8765432109", email="singh@example.com", 
                  address="456 Park Ave, Mumbai", gst_number="GSTIN0987654321", 
                  outstanding_balance=0, party_type="buyer"),
            
            Party(name="Patel Enterprises", contact_person="Nikhil Patel", 
                  phone="7654321098", email="patel@example.com", 
                  address="789 Lake Rd, Ahmedabad", gst_number="GSTIN2345678901", 
                  outstanding_balance=0, party_type="seller"),
        ]
        
        for party in parties:
            db.session.add(party)
        
        db.session.commit()
        print(f"Added {len(parties)} sample parties")
        
        # Create a sample invoice
        invoice_date = datetime.now()
        invoice = Invoice(
            invoice_number="23-06-0001",
            date=invoice_date,
            party_id=1,  # Sharma Transport
            vehicle_number="DL01AB1234",
            total_amount=15000,
            pakka_party_id=3,  # Patel Enterprises (seller)
            pakka_amount=10000,
            kaccha_amount=5000
        )
        
        db.session.add(invoice)
        db.session.flush()  # Get the invoice ID
        
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
        
        db.session.commit()
        print("Added sample invoice with line items and expenses")
        
        print("Database fix complete!")

if __name__ == "__main__":
    fix_database()
