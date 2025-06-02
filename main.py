from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
from datetime import datetime, timedelta
import os
from config import Config
from sqlalchemy import func, literal, and_
from flask_migrate import Migrate
from models import db, Party, Invoice, LineItem, Expense, Transaction

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db.init_app(app)
migrate = Migrate(app, db)

# Sample users data
users = [
    {
        'id': 1,
        'name': 'Alice Johnson',
        'email': 'alice.johnson@example.com',
        'role': 'Admin',
        'status': 'Active'
    },
    {
        'id': 2,
        'name': 'Bob Williams',
        'email': 'bob.williams@example.com',
        'role': 'Editor',
        'status': 'Active'
    },
    {
        'id': 3,
        'name': 'Charlie Davis',
        'email': 'charlie.davis@example.com',
        'role': 'Viewer',
        'status': 'Inactive'
    }
]

# App preferences
app_preferences = {
    'currencies': ['USD', 'EUR', 'GBP', 'INR', 'JPY'],
    'default_currency': 'INR',
    'theme': 'light'
}

@app.route('/')
@app.route('/dashboard')
def dashboard():
    """
    Dashboard route that displays key metrics and recent transactions
    """
    try:
        # Default to 'today' time period
        time_period = request.args.get('period', 'today')
        
        # Calculate date ranges based on time period
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        if time_period == 'today':
            start_date = today
        elif time_period == 'week':
            start_date = today - timedelta(days=7)
        elif time_period == 'month':
            start_date = today - timedelta(days=30)
        else:
            start_date = today
        
        # Calculate metrics
        # 1. Total Revenue (sum of invoice amounts in the period)
        total_revenue = db.session.query(func.sum(Invoice.total_amount))\
            .filter(Invoice.date >= start_date).scalar() or 0
            
        # 2. Outstanding Payments (sum of all party outstanding balances)
        outstanding_payments = db.session.query(func.sum(Party.outstanding_balance))\
            .filter(Party.outstanding_balance > 0).scalar() or 0
            
        # 3. Overdue Amount (outstanding balances over 30 days)
        # This is a simplified calculation - in a real system, you'd track invoice due dates
        overdue_date = today - timedelta(days=30)
        overdue_amount = db.session.query(func.sum(Invoice.total_amount))\
            .join(Party, Invoice.party_id == Party.id)\
            .filter(Invoice.date < overdue_date)\
            .filter(Party.outstanding_balance > 0).scalar() or 0
            
        # 4. Total Transactions in the period
        total_transactions = Invoice.query.filter(Invoice.date >= start_date).count() + \
                            Transaction.query.filter(Transaction.payment_date >= start_date).count()
        
        # Prepare metrics object
        metrics = {
            'total_revenue': total_revenue,
            'outstanding_payments': outstanding_payments,
            'overdue_amount': overdue_amount,
            'total_transactions': total_transactions
        }
        
        # Get recent transactions (combine invoices and payments, sort by date)
        recent_invoices = Invoice.query\
            .join(Party, Invoice.party_id == Party.id)\
            .add_columns(
                Invoice.date.label('date'),
                Party.name.label('party'),
                Invoice.invoice_number.label('description'),
                Invoice.total_amount.label('amount'),
                literal('Invoice').label('type')
            )\
            .order_by(Invoice.date.desc())\
            .limit(10).all()
            
        recent_payments = Transaction.query\
            .join(Party, Transaction.party_id == Party.id)\
            .add_columns(
                Transaction.payment_date.label('date'),
                Party.name.label('party'),
                Transaction.notes.label('description'),
                Transaction.amount.label('amount'),
                literal('Payment').label('type')
            )\
            .order_by(Transaction.payment_date.desc())\
            .limit(10).all()
            
        # Combine and sort transactions
        transactions = []
        
        for invoice in recent_invoices:
            transactions.append({
                'date': invoice.date.strftime('%Y-%m-%d'),
                'party': invoice.party,
                'description': f"Invoice #{invoice.description}",
                'amount': invoice.amount,
                'status': 'Unpaid',  # Simplified - would need to check if fully paid in real system
                'type': invoice.type
            })
            
        for payment in recent_payments:
            transactions.append({
                'date': payment.date.strftime('%Y-%m-%d'),
                'party': payment.party,
                'description': payment.description or "Payment received",
                'amount': payment.amount,
                'status': 'Paid',
                'type': payment.type
            })
            
        # Sort combined transactions by date (most recent first)
        transactions.sort(key=lambda x: datetime.strptime(x['date'], '%Y-%m-%d'), reverse=True)
        
        # Limit to 10 most recent transactions
        transactions = transactions[:10]
        
        return render_template('dashboard.html', metrics=metrics, transactions=transactions, active_period=time_period)
        
    except Exception as e:
        app.logger.error(f"Dashboard error: {str(e)}")
        # Return a basic dashboard with error message
        return render_template('dashboard.html', 
                              metrics={'total_revenue': 0, 'outstanding_payments': 0, 
                                      'overdue_amount': 0, 'total_transactions': 0},
                              transactions=[],
                              error=str(e))

# Party Routes
@app.route('/parties')
def parties():
    all_parties = Party.query.all()
    return render_template('parties.html', parties=all_parties)

@app.route('/api/parties', methods=['GET'])
def get_parties():
    all_parties = Party.query.all()
    return jsonify([party.to_dict() for party in all_parties])

@app.route('/api/parties', methods=['POST'])
def add_party():
    data = request.json
    
    # Validate required fields
    if not data.get('name'):
        return jsonify({'error': 'Party name is required'}), 400
    
    # Create new party
    new_party = Party(
        name=data.get('name'),
        party_type=data.get('party_type', 'buyer'),
        contact_person=data.get('contact_person', ''),
        phone=data.get('phone', ''),
        email=data.get('email', ''),
        address=data.get('address', ''),
        gst_number=data.get('gst_number', ''),
        outstanding_balance=float(data.get('outstanding_balance', 0.0))
    )
    
    try:
        db.session.add(new_party)
        db.session.commit()
        return jsonify(new_party.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/parties/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party = Party.query.get_or_404(party_id)
    return jsonify(party.to_dict())

@app.route('/api/parties/<int:party_id>', methods=['PUT'])
def update_party(party_id):
    party = Party.query.get_or_404(party_id)
    data = request.json
    
    # Update party fields
    if 'name' in data:
        party.name = data['name']
    if 'party_type' in data:
        party.party_type = data['party_type']
    if 'contact_person' in data:
        party.contact_person = data['contact_person']
    if 'phone' in data:
        party.phone = data['phone']
    if 'email' in data:
        party.email = data['email']
    if 'address' in data:
        party.address = data['address']
    if 'gst_number' in data:
        party.gst_number = data['gst_number']
    if 'outstanding_balance' in data:
        party.outstanding_balance = float(data['outstanding_balance'])
    
    try:
        db.session.commit()
        return jsonify(party.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/parties/<int:party_id>', methods=['DELETE'])
def delete_party(party_id):
    party = Party.query.get_or_404(party_id)
    
    try:
        db.session.delete(party)
        db.session.commit()
        return jsonify({'message': 'Party deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/invoices/create')
def create_invoice():
    parties = Party.query.all()
    # Filter for only seller parties for pakka amount
    seller_parties = [party for party in parties if party.party_type == 'seller']
    return render_template('create_invoice.html', parties=parties, seller_parties=seller_parties)

@app.route('/invoices')
def invoices():
    return render_template('invoices.html')

@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    """Get all invoices"""
    invoices = Invoice.query.order_by(Invoice.date.desc()).all()
    
    # Create a list to store enriched invoice data
    enriched_invoices = []
    
    for invoice in invoices:
        # Get basic invoice data
        invoice_data = invoice.to_dict()
        
        # Add party name
        if invoice.party_id:
            party = Party.query.get(invoice.party_id)
            if party:
                invoice_data['party_name'] = party.name
        
        # Add pakka party name if applicable
        if invoice.pakka_party_id:
            pakka_party = Party.query.get(invoice.pakka_party_id)
            if pakka_party:
                invoice_data['pakka_party_name'] = pakka_party.name
        
        enriched_invoices.append(invoice_data)
    
    return jsonify(enriched_invoices)

@app.route('/api/invoices', methods=['POST'])
def add_invoice():
    """Add a new invoice"""
    data = request.json
    
    try:
        # Generate invoice number (you can customize this logic)
        today = datetime.now()
        invoice_count = Invoice.query.filter(
            db.extract('year', Invoice.created_at) == today.year,
            db.extract('month', Invoice.created_at) == today.month
        ).count()
        invoice_number = f"INV-{today.strftime('%Y%m')}-{invoice_count + 1:04d}"
        
        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
            party_id=data['party_id'],
            vehicle_number=data.get('vehicleNumber', ''),
            pakka_party_id=data.get('pakkaParty'),
            pakka_amount=float(data.get('pakkaAmount', 0)),
            kaccha_amount=float(data.get('kacchaAmount', 0))
        )
        
        # Add line items
        line_items_total = 0
        for item in data.get('lineItems', []):
            amount = float(item['quantity']) * float(item['rate'])
            line_items_total += amount
            line_item = LineItem(
                description=item['description'],
                quantity=float(item['quantity']),
                rate=float(item['rate']),
                amount=amount
            )
            invoice.line_items.append(line_item)
        
        # Add expenses
        expenses_total = 0
        for expense in data.get('expenses', []):
            expense_amount = float(expense['amount'])
            expenses_total += expense_amount
            exp = Expense(
                expense_type=expense['type'],
                amount=expense_amount
            )
            invoice.expenses.append(exp)
        
        # Calculate total amount
        invoice.total_amount = line_items_total + expenses_total
        
        # Validate pakka party is a seller
        if invoice.pakka_party_id:
            pakka_party = Party.query.get(invoice.pakka_party_id)
            if not pakka_party or pakka_party.party_type != 'seller':
                return jsonify({'error': 'Pakka party must be a seller'}), 400
        
        # Validate that pakka_amount + kaccha_amount = total_amount
        if abs((invoice.pakka_amount + invoice.kaccha_amount) - invoice.total_amount) > 0.01:
            return jsonify({'error': f'Pakka amount (₹{invoice.pakka_amount}) + Kaccha amount (₹{invoice.kaccha_amount}) must equal total amount (₹{invoice.total_amount})'}), 400
        
        # Update pakka party's outstanding balance if pakka party is selected
        if invoice.pakka_party_id and invoice.pakka_amount > 0:
            pakka_party = Party.query.get(invoice.pakka_party_id)
            if pakka_party:
                # Increase the pakka party's outstanding balance (amount to be received)
                pakka_party.outstanding_balance += invoice.pakka_amount
                
        # Update the buyer party's outstanding balance (amount to be paid)
        if invoice.party_id:
            buyer_party = Party.query.get(invoice.party_id)
            if buyer_party:
                # Increase the buyer's outstanding balance (they owe money)
                buyer_party.outstanding_balance += invoice.total_amount
        
        db.session.add(invoice)
        db.session.commit()
        
        return jsonify({'message': 'Invoice created successfully', 'invoice': invoice.to_dict()}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    """Get a specific invoice"""
    invoice = Invoice.query.get_or_404(invoice_id)
    
    # Get the base invoice data
    invoice_data = invoice.to_dict()
    
    # Add party names
    if invoice.party_id:
        party = Party.query.get(invoice.party_id)
        if party:
            invoice_data['party_name'] = party.name
    
    # Add pakka party name if applicable
    if invoice.pakka_party_id:
        pakka_party = Party.query.get(invoice.pakka_party_id)
        if pakka_party:
            invoice_data['pakka_party_name'] = pakka_party.name
    
    # Add line items
    line_items = LineItem.query.filter_by(invoice_id=invoice.id).all()
    invoice_data['line_items'] = [item.to_dict() for item in line_items]
    
    # Add expenses
    expenses = Expense.query.filter_by(invoice_id=invoice.id).all()
    invoice_data['expenses'] = [expense.to_dict() for expense in expenses]
    
    return jsonify(invoice_data)

@app.route('/api/invoices/<int:invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    """Update an invoice"""
    invoice = Invoice.query.get_or_404(invoice_id)
    data = request.json
    
    try:
        # Store original values for balance adjustment
        original_pakka_amount = invoice.pakka_amount
        original_pakka_party_id = invoice.pakka_party_id
        original_total_amount = invoice.total_amount
        original_party_id = invoice.party_id
        
        # Update invoice fields
        if 'date' in data:
            invoice.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        if 'party_id' in data:
            invoice.party_id = data['party_id']
        if 'vehicleNumber' in data:
            invoice.vehicle_number = data['vehicleNumber']
        if 'pakkaParty' in data:
            invoice.pakka_party_id = data['pakkaParty'] or None
        if 'pakkaAmount' in data:
            invoice.pakka_amount = float(data['pakkaAmount'])
        if 'kacchaAmount' in data:
            invoice.kaccha_amount = float(data['kacchaAmount'])
        
        # Update line items (delete existing and add new ones)
        if 'lineItems' in data:
            # Delete existing line items
            for item in invoice.line_items:
                db.session.delete(item)
            
            # Add new line items
            line_items_total = 0
            for item in data['lineItems']:
                amount = float(item['quantity']) * float(item['rate'])
                line_items_total += amount
                line_item = LineItem(
                    invoice_id=invoice.id,
                    description=item['description'],
                    quantity=float(item['quantity']),
                    rate=float(item['rate']),
                    amount=amount
                )
                db.session.add(line_item)
        else:
            # Calculate total from existing line items if not updating them
            line_items_total = sum(item.amount for item in invoice.line_items)
        
        # Update expenses (delete existing and add new ones)
        if 'expenses' in data:
            # Delete existing expenses
            for expense in invoice.expenses:
                db.session.delete(expense)
            
            # Add new expenses
            expenses_total = 0
            for expense in data['expenses']:
                expense_amount = float(expense['amount'])
                expenses_total += expense_amount
                exp = Expense(
                    invoice_id=invoice.id,
                    expense_type=expense['type'],
                    amount=expense_amount
                )
                db.session.add(exp)
        else:
            # Calculate total from existing expenses if not updating them
            expenses_total = sum(expense.amount for expense in invoice.expenses)
        
        # Recalculate total amount
        invoice.total_amount = line_items_total + expenses_total
        
        # Validate pakka party is a seller
        if invoice.pakka_party_id:
            pakka_party = Party.query.get(invoice.pakka_party_id)
            if not pakka_party or pakka_party.party_type != 'seller':
                return jsonify({'error': 'Pakka party must be a seller'}), 400
        
        # Validate that pakka_amount + kaccha_amount = total_amount
        if abs((invoice.pakka_amount + invoice.kaccha_amount) - invoice.total_amount) > 0.01:
            return jsonify({'error': f'Pakka amount (₹{invoice.pakka_amount}) + Kaccha amount (₹{invoice.kaccha_amount}) must equal total amount (₹{invoice.total_amount})'}), 400
        
        # Update outstanding balances
        # First, reverse the original pakka amount if there was one
        if original_pakka_party_id:
            original_pakka_party = Party.query.get(original_pakka_party_id)
            if original_pakka_party:
                # Decrease the original pakka party's outstanding balance
                original_pakka_party.outstanding_balance -= original_pakka_amount
        
        # Then add the new pakka amount to the new pakka party
        if invoice.pakka_party_id and invoice.pakka_amount > 0:
            new_pakka_party = Party.query.get(invoice.pakka_party_id)
            if new_pakka_party:
                # Increase the new pakka party's outstanding balance
                new_pakka_party.outstanding_balance += invoice.pakka_amount
        
        # Update the buyer party's outstanding balance
        # First, reverse the original buyer's outstanding balance
        if original_party_id:
            original_buyer = Party.query.get(original_party_id)
            if original_buyer:
                original_buyer.outstanding_balance -= original_total_amount
        
        # Then add the new total to the new buyer's outstanding balance
        if invoice.party_id:
            new_buyer = Party.query.get(invoice.party_id)
            if new_buyer:
                new_buyer.outstanding_balance += invoice.total_amount
        
        db.session.commit()
        
        return jsonify({'message': 'Invoice updated successfully', 'invoice': invoice.to_dict()})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    """Delete an invoice"""
    invoice = Invoice.query.get_or_404(invoice_id)
    
    try:
        # Adjust pakka party's outstanding balance if needed
        if invoice.pakka_party_id and invoice.pakka_amount > 0:
            pakka_party = Party.query.get(invoice.pakka_party_id)
            if pakka_party:
                # Decrease the pakka party's outstanding balance
                pakka_party.outstanding_balance -= invoice.pakka_amount
        
        # Adjust buyer party's outstanding balance
        if invoice.party_id:
            buyer_party = Party.query.get(invoice.party_id)
            if buyer_party:
                # Decrease the buyer's outstanding balance
                buyer_party.outstanding_balance -= invoice.total_amount
        
        db.session.delete(invoice)
        db.session.commit()
        return jsonify({'message': 'Invoice deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>/generate', methods=['GET'])
def generate_invoice(invoice_id):
    """Generate a printable/downloadable invoice"""
    invoice = Invoice.query.get_or_404(invoice_id)
    
    # Get related data
    party = Party.query.get(invoice.party_id)
    pakka_party = Party.query.get(invoice.pakka_party_id) if invoice.pakka_party_id else None
    line_items = LineItem.query.filter_by(invoice_id=invoice.id).all()
    expenses = Expense.query.filter_by(invoice_id=invoice.id).all()
    
    # Calculate subtotals
    line_items_total = sum(item.amount for item in line_items)
    expenses_total = sum(expense.amount for expense in expenses)
    
    return render_template(
        'invoice_template.html',
        invoice=invoice,
        party=party,
        pakka_party=pakka_party,
        line_items=line_items,
        expenses=expenses,
        line_items_total=line_items_total,
        expenses_total=expenses_total
    )

@app.route('/payments/record')
def record_payment():
    """Render the payment recording page"""
    parties = Party.query.all()
    return render_template('record_payment.html', parties=parties, view_transactions_url=url_for('view_transactions'))

@app.route('/payments')
def view_transactions():
    """Render the transactions list page"""
    parties = Party.query.all()
    return render_template('transactions.html', parties=parties)

@app.route('/api/party-dues/<int:party_id>', methods=['GET'])
def get_party_dues(party_id):
    """Get outstanding and past dues for a party"""
    party = Party.query.get_or_404(party_id)
    
    # Get total outstanding balance
    outstanding_dues = party.outstanding_balance
    
    # Calculate past dues (invoices older than 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    past_due_invoices = Invoice.query.filter(
        Invoice.party_id == party_id,
        Invoice.date < thirty_days_ago
    ).all()
    
    past_dues = sum(invoice.total_amount for invoice in past_due_invoices)
    
    return jsonify({
        'outstanding_dues': outstanding_dues,
        'past_dues': past_dues
    })

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    """Record a new payment transaction"""
    data = request.json
    
    try:
        # Validate required fields
        if not data.get('party_id'):
            return jsonify({'error': 'Party is required'}), 400
        
        if not data.get('amount') or float(data.get('amount')) <= 0:
            return jsonify({'error': 'Valid payment amount is required'}), 400
        
        # Get the party
        party = Party.query.get_or_404(data['party_id'])
        
        # Create transaction
        transaction = Transaction(
            party_id=data['party_id'],
            payment_date=datetime.strptime(data['payment_date'], '%Y-%m-%d') if data.get('payment_date') else datetime.now(),
            amount=float(data['amount']),
            notes=data.get('notes', '')
        )
        
        # Update party's outstanding balance
        party.outstanding_balance -= transaction.amount
        
        # Save to database
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'message': 'Payment recorded successfully',
            'transaction': transaction.to_dict(),
            'new_balance': party.outstanding_balance
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Get all transactions with optional filtering"""
    party_id = request.args.get('party_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Start with base query
    query = Transaction.query
    
    # Apply filters if provided
    if party_id:
        query = query.filter(Transaction.party_id == party_id)
    
    if start_date:
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        query = query.filter(Transaction.payment_date >= start_date)
    
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
        # Add one day to include the end date fully
        end_date = end_date + timedelta(days=1)
        query = query.filter(Transaction.payment_date < end_date)
    
    # Order by payment date (newest first)
    transactions = query.order_by(Transaction.payment_date.desc()).all()
    
    # Prepare response with party names
    result = []
    for transaction in transactions:
        transaction_data = transaction.to_dict()
        party = Party.query.get(transaction.party_id)
        if party:
            transaction_data['party_name'] = party.name
        result.append(transaction_data)
    
    return jsonify(result)

@app.route('/api/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """Get a specific transaction by ID"""
    transaction = Transaction.query.get_or_404(transaction_id)
    
    # Get transaction data with party name
    transaction_data = transaction.to_dict()
    party = Party.query.get(transaction.party_id)
    if party:
        transaction_data['party_name'] = party.name
    
    return jsonify(transaction_data)

@app.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """Update an existing transaction"""
    transaction = Transaction.query.get_or_404(transaction_id)
    data = request.json
    
    try:
        # Get original amount to calculate balance adjustment
        original_amount = transaction.amount
        
        # Get the party
        party = Party.query.get_or_404(transaction.party_id)
        
        # If party is changing, update both parties' balances
        if data.get('party_id') and int(data['party_id']) != transaction.party_id:
            # Restore original party's balance
            party.outstanding_balance += original_amount
            
            # Get new party and update its balance
            new_party = Party.query.get_or_404(data['party_id'])
            new_party.outstanding_balance -= float(data['amount'])
            
            # Update transaction party
            transaction.party_id = data['party_id']
        else:
            # Just update the same party's balance with the difference
            amount_difference = original_amount - float(data['amount'])
            party.outstanding_balance += amount_difference
        
        # Update transaction fields
        if data.get('payment_date'):
            transaction.payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d')
        
        if data.get('amount'):
            transaction.amount = float(data['amount'])
        
        if 'notes' in data:
            transaction.notes = data['notes']
        
        # Update timestamp
        transaction.updated_at = datetime.now()
        
        # Save changes
        db.session.commit()
        
        return jsonify({
            'message': 'Transaction updated successfully',
            'transaction': transaction.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Delete a transaction"""
    transaction = Transaction.query.get_or_404(transaction_id)
    
    try:
        # Get the party to update balance
        party = Party.query.get_or_404(transaction.party_id)
        
        # Restore the party's outstanding balance (add back the payment amount)
        party.outstanding_balance += transaction.amount
        
        # Delete the transaction
        db.session.delete(transaction)
        db.session.commit()
        
        return jsonify({
            'message': 'Transaction deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/reports')
def reports():
    """Render the reports page"""
    parties = Party.query.all()
    current_date = datetime.now().strftime('%d/%m/%Y')
    return render_template('reports.html', parties=parties, current_date=current_date)

@app.route('/api/reports', methods=['GET'])
def generate_report():
    """Generate a report based on filters"""
    party_id = request.args.get('party_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Parse dates if provided
    start_date_obj = None
    end_date_obj = None
    
    if start_date:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
    
    if end_date:
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
        # Add one day to include the end date fully
        end_date_obj = end_date_obj + timedelta(days=1)
    
    # Prepare report data
    report_data = {
        'invoices': [],
        'transactions': [],
        'summary': {
            'total_amount': 0,
            'paid_amount': 0,
            'outstanding_amount': 0
        },
        'party_balances': [],
        'ledger_entries': []
    }
    
    # Get parties for the report
    if party_id:
        parties = [Party.query.get(party_id)]
    else:
        parties = Party.query.all()
    
    # Process each party
    for party in parties:
        if not party:
            continue
            
        # Calculate opening balance (as of start_date)
        opening_balance = party.outstanding_balance  # This is the initial balance when party was created
        
        # If start_date is provided, adjust opening balance by transactions before start_date
        if start_date_obj:
            # Invoices before start date increase the opening balance
            invoices_before_start = Invoice.query.filter(
                Invoice.party_id == party.id,
                Invoice.date < start_date_obj
            ).all()
            
            for invoice in invoices_before_start:
                opening_balance += invoice.total_amount
            
            # Payments before start date decrease the opening balance
            payments_before_start = Transaction.query.filter(
                Transaction.party_id == party.id,
                Transaction.payment_date < start_date_obj
            ).all()
            
            for payment in payments_before_start:
                opening_balance -= payment.amount
        
        # Add opening balance to ledger entries
        report_data['ledger_entries'].append({
            'party_id': party.id,
            'party_name': party.name,
            'date': start_date if start_date else 'Initial',
            'description': 'Opening Balance',
            'debit': 0,
            'credit': 0,
            'balance': opening_balance,
            'type': 'opening'
        })
        
        # Get invoices for this party within date range
        invoice_query = Invoice.query.filter(Invoice.party_id == party.id)
        if start_date_obj:
            invoice_query = invoice_query.filter(Invoice.date >= start_date_obj)
        if end_date_obj:
            invoice_query = invoice_query.filter(Invoice.date < end_date_obj)
        
        invoices = invoice_query.order_by(Invoice.date.asc()).all()
        
        # Get payments for this party within date range
        payment_query = Transaction.query.filter(Transaction.party_id == party.id)
        if start_date_obj:
            payment_query = payment_query.filter(Transaction.payment_date >= start_date_obj)
        if end_date_obj:
            payment_query = payment_query.filter(Transaction.payment_date < end_date_obj)
        
        payments = payment_query.order_by(Transaction.payment_date.asc()).all()
        
        # Combine invoices and payments into a chronological ledger
        running_balance = opening_balance
        
        # Process invoices
        for invoice in invoices:
            # Add invoice to report data
            invoice_data = invoice.to_dict()
            invoice_data['party_name'] = party.name
            
            # Add pakka party name if applicable
            if invoice.pakka_party_id:
                pakka_party = Party.query.get(invoice.pakka_party_id)
                invoice_data['pakka_party_name'] = pakka_party.name if pakka_party else 'Unknown'
            
            # Add line items and expenses
            invoice_data['line_items'] = [item.to_dict() for item in invoice.line_items]
            invoice_data['expenses'] = [expense.to_dict() for expense in invoice.expenses]
            
            # Update running balance
            running_balance += invoice.total_amount
            
            # Add to ledger entries
            report_data['ledger_entries'].append({
                'party_id': party.id,
                'party_name': party.name,
                'date': invoice.date.isoformat(),
                'description': f'Invoice #{invoice.invoice_number}',
                'debit': invoice.total_amount,
                'credit': 0,
                'balance': running_balance,
                'type': 'invoice',
                'invoice_id': invoice.id,
                'invoice_data': invoice_data
            })
            
            # Add to invoices list
            report_data['invoices'].append(invoice_data)
            
            # Update summary
            report_data['summary']['total_amount'] += invoice.total_amount
        
        # Process payments
        for payment in payments:
            # Add payment to report data
            payment_data = payment.to_dict()
            payment_data['party_name'] = party.name
            
            # Update running balance
            running_balance -= payment.amount
            
            # Add to ledger entries
            report_data['ledger_entries'].append({
                'party_id': party.id,
                'party_name': party.name,
                'date': payment.payment_date.isoformat(),
                'description': f'Payment {payment.notes if payment.notes else ""}',
                'debit': 0,
                'credit': payment.amount,
                'balance': running_balance,
                'type': 'payment',
                'payment_id': payment.id,
                'payment_data': payment_data
            })
            
            # Add to transactions list
            report_data['transactions'].append(payment_data)
            
            # Update summary
            report_data['summary']['paid_amount'] += payment.amount
        
        # Add closing balance to ledger entries
        report_data['ledger_entries'].append({
            'party_id': party.id,
            'party_name': party.name,
            'date': end_date if end_date else 'Current',
            'description': 'Closing Balance',
            'debit': 0,
            'credit': 0,
            'balance': running_balance,
            'type': 'closing'
        })
        
        # Add party balance to report
        report_data['party_balances'].append({
            'id': party.id,
            'name': party.name,
            'opening_balance': opening_balance,
            'closing_balance': running_balance,
            'outstanding_balance': running_balance  # For backward compatibility
        })
    
    # Calculate final outstanding amount
    report_data['summary']['outstanding_amount'] = report_data['summary']['total_amount'] - report_data['summary']['paid_amount']
    
    # Sort ledger entries by date
    report_data['ledger_entries'].sort(key=lambda x: (
        x['party_name'],
        '0000-00-00' if x['date'] == 'Initial' else ('9999-99-99' if x['date'] == 'Current' else x['date'])
    ))
    
    return jsonify(report_data)

@app.route('/api/reports/export/pdf', methods=['POST'])
def export_report_pdf():
    """Export report as PDF"""
    # This would typically use a PDF generation library
    # For now, we'll just return a success message
    return jsonify({'message': 'PDF export functionality will be implemented server-side'})

@app.route('/settings')
def settings_page():
    return render_template('settings.html', users=users, preferences=app_preferences)

# User Management API
@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify(users)

@app.route('/api/users', methods=['POST'])
def add_user():
    data = request.json
    
    # Validate required fields
    required_fields = ['name', 'email', 'role', 'status']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    # Validate email format
    import re
    email_regex = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    if not email_regex.match(data['email']):
        return jsonify({'message': 'Invalid email format'}), 400
    
    # Check for duplicate email
    if any(user['email'] == data['email'] for user in users):
        return jsonify({'message': 'Email already exists'}), 400
    
    # Create new user
    new_user = {
        'id': max(user['id'] for user in users) + 1 if users else 1,
        'name': data['name'],
        'email': data['email'],
        'role': data['role'],
        'status': data['status']
    }
    
    users.append(new_user)
    return jsonify(new_user), 201

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = next((user for user in users if user['id'] == user_id), None)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(user)

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    user = next((user for user in users if user['id'] == user_id), None)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Validate required fields
    required_fields = ['name', 'email', 'role', 'status']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    # Validate email format
    import re
    email_regex = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    if not email_regex.match(data['email']):
        return jsonify({'message': 'Invalid email format'}), 400
    
    # Check for duplicate email (excluding current user)
    if any(u['email'] == data['email'] and u['id'] != user_id for u in users):
        return jsonify({'message': 'Email already exists'}), 400
    
    # Update user
    user['name'] = data['name']
    user['email'] = data['email']
    user['role'] = data['role']
    user['status'] = data['status']
    
    return jsonify(user)

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    global users
    user = next((user for user in users if user['id'] == user_id), None)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Remove user
    users = [u for u in users if u['id'] != user_id]
    return jsonify({'message': 'User deleted successfully'})

# App Preferences API
@app.route('/api/preferences', methods=['GET'])
def get_preferences():
    return jsonify(app_preferences)

@app.route('/api/preferences', methods=['PUT'])
def update_preferences():
    data = request.json
    
    # Update theme if provided
    if 'theme' in data:
        if data['theme'] not in ['light', 'dark']:
            return jsonify({'message': 'Invalid theme value'}), 400
        app_preferences['theme'] = data['theme']
    
    # Update default currency if provided
    if 'default_currency' in data:
        if data['default_currency'] not in app_preferences['currencies']:
            return jsonify({'message': 'Invalid currency value'}), 400
        app_preferences['default_currency'] = data['default_currency']
    
    return jsonify(app_preferences)

# Data Management API
@app.route('/api/backup', methods=['POST'])
def backup_data():
    try:
        # Create backup directory if it doesn't exist
        backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Generate backup filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_dir, f'billprozen_backup_{timestamp}.json')
        
        # Get all data from database
        backup_data = {
            'parties': [party.to_dict() for party in Party.query.all()],
            'invoices': [invoice.to_dict() for invoice in Invoice.query.all()],
            'line_items': [item.to_dict() for item in LineItem.query.all()],
            'expenses': [expense.to_dict() for expense in Expense.query.all()],
            'transactions': [transaction.to_dict() for transaction in Transaction.query.all()],
            'preferences': app_preferences,
            'users': users
        }
        
        # Write backup to file
        with open(backup_file, 'w') as f:
            import json
            json.dump(backup_data, f, indent=2, default=str)
        
        return jsonify({'message': 'Backup created successfully', 'file': backup_file}), 200
    
    except Exception as e:
        return jsonify({'message': f'Error creating backup: {str(e)}'}), 500

@app.route('/api/export', methods=['GET'])
def export_data():
    try:
        # Get all data from database
        export_data = {
            'parties': [party.to_dict() for party in Party.query.all()],
            'invoices': [invoice.to_dict() for invoice in Invoice.query.all()],
            'line_items': [item.to_dict() for item in LineItem.query.all()],
            'expenses': [expense.to_dict() for expense in Expense.query.all()],
            'transactions': [transaction.to_dict() for transaction in Transaction.query.all()]
        }
        
        # Return as downloadable JSON file
        return jsonify(export_data), 200, {
            'Content-Disposition': 'attachment; filename=billprozen_data_export.json'
        }
    
    except Exception as e:
        return jsonify({'message': f'Error exporting data: {str(e)}'}), 500

# Create database tables
with app.app_context():
    db.create_all()
    print("Database tables created!")

if __name__ == '__main__':
    app.run(debug=True)
