from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Party(db.Model):
    """
    Party model representing customers, suppliers, or other business entities
    that the user interacts with for invoicing and payments.
    """
    __tablename__ = 'parties'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    party_type = db.Column(db.String(20), nullable=False, default='buyer')  # 'buyer' or 'seller'
    contact_person = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.Text)
    gst_number = db.Column(db.String(20))
    outstanding_balance = db.Column(db.Float, default=0.0)  # Represents the opening balance when party is created
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Party {self.name} ({self.party_type})>'
    
    def to_dict(self):
        """
        Convert Party object to dictionary for JSON serialization
        """
        return {
            'id': self.id,
            'name': self.name,
            'party_type': self.party_type,
            'contact_person': self.contact_person,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'gst_number': self.gst_number,
            'outstanding_balance': self.outstanding_balance,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Invoice(db.Model):
    """
    Invoice model representing billing transactions with parties.
    Includes line items, expenses, and special billing amounts (pakka/kaccha).
    """
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(20), unique=True, nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    party_id = db.Column(db.Integer, db.ForeignKey('parties.id'), nullable=False)
    vehicle_number = db.Column(db.String(20))
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    pakka_party_id = db.Column(db.Integer, db.ForeignKey('parties.id'))
    pakka_amount = db.Column(db.Float, default=0.0)
    kaccha_amount = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    party = db.relationship('Party', foreign_keys=[party_id])
    pakka_party = db.relationship('Party', foreign_keys=[pakka_party_id])
    line_items = db.relationship('LineItem', backref='invoice', cascade='all, delete-orphan')
    expenses = db.relationship('Expense', backref='invoice', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'
    
    def to_dict(self):
        """
        Convert Invoice object to dictionary for JSON serialization
        """
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'date': self.date.isoformat() if self.date else None,
            'party_id': self.party_id,
            'vehicle_number': self.vehicle_number,
            'total_amount': self.total_amount,
            'pakka_party_id': self.pakka_party_id,
            'pakka_amount': self.pakka_amount,
            'kaccha_amount': self.kaccha_amount,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class LineItem(db.Model):
    """
    Line item model representing individual items in an invoice.
    """
    __tablename__ = 'line_items'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=1.0)
    rate = db.Column(db.Float, nullable=False, default=0.0)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<LineItem {self.description} for Invoice {self.invoice_id}>'
    
    def to_dict(self):
        """
        Convert LineItem object to dictionary for JSON serialization
        """
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'description': self.description,
            'quantity': self.quantity,
            'rate': self.rate,
            'amount': self.amount,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Expense(db.Model):
    """
    Expense model representing additional expenses in an invoice.
    """
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    expense_type = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Expense {self.expense_type} for Invoice {self.invoice_id}>'
    
    def to_dict(self):
        """
        Convert Expense object to dictionary for JSON serialization
        """
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'expense_type': self.expense_type,
            'amount': self.amount,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Transaction(db.Model):
    """
    Transaction model representing payments made by parties.
    """
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    party_id = db.Column(db.Integer, db.ForeignKey('parties.id'), nullable=False)
    payment_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    party = db.relationship('Party', backref='transactions')
    
    def __repr__(self):
        return f'<Transaction {self.id} for Party {self.party_id}>'
    
    def to_dict(self):
        """
        Convert Transaction object to dictionary for JSON serialization
        """
        return {
            'id': self.id,
            'party_id': self.party_id,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'amount': self.amount,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
