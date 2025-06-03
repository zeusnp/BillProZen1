from models import db, Transaction, Party
from app import create_app

app = create_app()
with app.app_context():
    # Check if there are any transactions
    transactions = Transaction.query.all()
    print(f"Found {len(transactions)} transactions in the database:")
    
    for t in transactions:
        party = Party.query.get(t.party_id)
        party_name = party.name if party else "Unknown Party"
        print(f"ID: {t.id}, Date: {t.payment_date}, Party: {party_name}, Amount: {t.amount}, Type: {t.payment_type}, Notes: {t.notes}")
