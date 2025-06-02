# BillProZen

BillProZen is a comprehensive invoice and reporting system designed for small to medium businesses. It provides tools for managing parties (customers/suppliers), creating invoices, recording payments, and generating reports.

## Features

- **Dashboard**: Overview of business metrics and recent transactions
- **Parties Management**: Add, edit, view, and delete business parties
- **Invoice Generation**: Create and manage invoices
- **Payment Recording**: Record and track payments
- **Reporting**: Generate detailed reports with filtering options
- **Settings**: Manage users, preferences, and data

## Technology Stack

- **Backend**: Flask (Python)
- **Database**: SQLAlchemy with SQLite (configurable to other databases)
- **Frontend**: HTML, CSS, JavaScript
- **UI Framework**: Custom responsive design

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd billprozen
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Initialize the database:
   ```
   python init_db.py
   ```

4. Set up database migrations:
   ```
   # Set the Flask application
   set FLASK_APP=app.py
   
   # Initialize migrations repository
   flask db init
   
   # Create initial migration
   flask db migrate -m "Initial migration"
   
   # Apply the migration
   flask db upgrade
   ```

5. Alternatively, you can use the CLI script for database operations:
   ```
   # Create tables
   python migrations_cli.py create-tables
   
   # Seed sample data
   python migrations_cli.py seed-data
   ```

6. Run the application:
   ```
   python main.py
   ```

7. Access the application in your browser:
   ```
   http://localhost:5000
   ```

## Environment Variables

You can customize the application using environment variables:

- `DATABASE_URL`: Database connection string (default: SQLite)
- `SECRET_KEY`: Secret key for session management
- `FLASK_DEBUG`: Enable debug mode (set to "True" for development)

These can be set in a `.env` file in the project root.

## Project Structure

- `main.py`: Main application file with routes
- `models.py`: Database models
- `config.py`: Application configuration
- `init_db.py`: Database initialization script
- `migrations.py`: Database migration utilities
- `static/`: Static assets (CSS, JS, images)
- `templates/`: HTML templates
- `migrations/`: Database migration files (created by Flask-Migrate)

## Modules

### Parties Module

The Parties module allows you to manage your business contacts:

- View a list of all parties
- Add new parties with contact details
- Edit existing party information
- Delete parties
- View detailed party information including outstanding balance

### Invoices Module

Create and manage invoices for your business transactions:

- Generate new invoices
- Select parties from your contacts
- Add line items with descriptions, quantities, and rates
- Calculate totals automatically

### Payments Module

Record payments received from customers:

- Record payment details
- Link payments to specific parties
- Track outstanding balances

### Reports Module

Generate detailed reports for your business:

- Party-wise reports
- Date range filtering
- Export reports to CSV
- Summary totals and analytics

## License

[License information]

## Contributors

[Contributor information]
