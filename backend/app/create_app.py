from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from app.config import Config
from app.extensions import db, migrate
from app.routes.health import health_bp
from app.routes.upload import upload_bp
from flask_cors import CORS
from app import models

def create_app():
  app = Flask(__name__)
  CORS(app, origins=[
        "http://localhost:5173",
        "https://personal-budget-yjnc.onrender.com"
  ])
  app.config.from_object(Config)

  db.init_app(app)
  migrate.init_app(app, db)

  app.register_blueprint(health_bp)
  app.register_blueprint(upload_bp)

  return app