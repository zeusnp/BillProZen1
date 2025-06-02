import os
import sys
from flask import Flask
from models import db
from config import Config
from init_db import init_db

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

if __name__ == "__main__":
    print("WARNING: This will reset the database and all data will be lost!")
    confirmation = input("Are you sure you want to continue? (y/n): ")
    
    if confirmation.lower() == 'y':
        print("Resetting database...")
        init_db()
        print("Database reset complete!")
    else:
        print("Database reset cancelled.")
