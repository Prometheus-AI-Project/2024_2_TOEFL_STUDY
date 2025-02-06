from flask import Flask
# from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)

CORS(app, expose_headers=["Content-Disposition"])

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///mydatabase.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

def get_api_key():
    """
    Reads the Google Cloud API key from a file.

    Returns:
        str: The Google Cloud API key.
    """
    with open("api_key.txt", "r") as f:
        return f.read().strip()
