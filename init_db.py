import os
import sys
from datetime import datetime, timedelta
import random
from flask import Flask
from models import db, Party, Invoice, LineItem, Expense
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

def init_db():
    with app.app_context():
        # Drop all tables and recreate
        db.drop_all()
        db.create_all()
        
        print("Creating sample data...")
        
        # Create sample parties
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
            
            Party(name="Gupta Traders", contact_person="Vikram Gupta", 
                  phone="6543210987", email="gupta@example.com", 
                  address="101 River St, Kolkata", gst_number="GSTIN3456789012", 
                  outstanding_balance=0, party_type="seller"),
            
            Party(name="Kumar Industries", contact_person="Sanjay Kumar", 
                  phone="5432109876", email="kumar@example.com", 
                  address="202 Hill Rd, Chennai", gst_number="GSTIN4567890123", 
                  outstanding_balance=0, party_type="buyer")
        ]
        
        for party in parties:
            db.session.add(party)
        
        db.session.commit()
        print(f"Added {len(parties)} sample parties")
        
        # Create sample invoices
        invoices = []
        expense_types = ["Loading", "Unloading", "Toll", "Fuel", "Maintenance", "Other"]
        vehicle_numbers = ["DL01AB1234", "MH02CD5678", "GJ03EF9012", "WB04GH3456", "TN05IJ7890"]
        
        # Get IDs of parties by type
        buyer_ids = [party.id for party in Party.query.filter_by(party_type="buyer").all()]
        seller_ids = [party.id for party in Party.query.filter_by(party_type="seller").all()]
        
        # Create 10 sample invoices
        for i in range(1, 11):
            # Generate a date within the last 60 days
            days_ago = random.randint(0, 60)
            invoice_date = datetime.now() - timedelta(days=days_ago)
            
            # Format invoice number as YY-MM-XXXX
            year_month = invoice_date.strftime('%y-%m')
            invoice_number = f"{year_month}-{i:04d}"
            
            # Randomly select a buyer party
            party_id = random.choice(buyer_ids)
            
            # Randomly decide if this invoice has pakka billing
            has_pakka = random.choice([True, False])
            pakka_party_id = random.choice(seller_ids) if has_pakka else None
            
            # Create invoice
            invoice = Invoice(
                invoice_number=invoice_number,
                date=invoice_date,
                party_id=party_id,
                vehicle_number=random.choice(vehicle_numbers),
                pakka_party_id=pakka_party_id,
                pakka_amount=random.randint(5000, 20000) if has_pakka else 0,
                kaccha_amount=random.randint(3000, 15000)
            )
            
            db.session.add(invoice)
            db.session.flush()  # Get the invoice ID
            
            # Add 1-5 line items for this invoice
            num_items = random.randint(1, 5)
            total_amount = 0
            
            for j in range(num_items):
                quantity = random.randint(1, 100)
                rate = random.randint(100, 1000)
                amount = quantity * rate
                total_amount += amount
                
                line_item = LineItem(
                    invoice_id=invoice.id,
                    description=f"Item {j+1}",
                    quantity=quantity,
                    rate=rate,
                    amount=amount
                )
                db.session.add(line_item)
            
            # Add 1-3 expenses for this invoice
            num_expenses = random.randint(1, 3)
            
            for j in range(num_expenses):
                expense_amount = random.randint(100, 2000)
                total_amount += expense_amount
                
                expense = Expense(
                    invoice_id=invoice.id,
                    expense_type=random.choice(expense_types),
                    amount=expense_amount
                )
                db.session.add(expense)
            
            # Update invoice total amount
            invoice.total_amount = total_amount
            invoices.append(invoice)
        
        db.session.commit()
        print(f"Added {len(invoices)} sample invoices with line items and expenses")
        
        print("Database initialization complete!")

if __name__ == "__main__":
    init_db()
