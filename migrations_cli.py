from flask.cli import FlaskGroup
from app import create_app
from models import db, Party

app = create_app()
cli = FlaskGroup(create_app=create_app)

@cli.command("create-tables")
def create_tables():
    """Create database tables from SQLAlchemy models"""
    db.create_all()
    print("Tables created successfully!")

@cli.command("seed-data")
def seed_data():
    """Seed the database with initial sample data"""
    # Check if we already have parties
    if Party.query.count() == 0:
        # Add sample parties
        parties = [
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
        
        # Add to database
        for party in parties:
            db.session.add(party)
        
        db.session.commit()
        print(f"Added {len(parties)} sample parties to the database!")
    else:
        print("Database already contains parties. Skipping seed operation.")

if __name__ == "__main__":
    cli()
