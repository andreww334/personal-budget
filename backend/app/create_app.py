from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from app.config import Config
from app.extensions import db, migrate
from app.routes.health import health_bp
from app.routes.upload import upload_bp
from app.routes.transactions import transactions_bp
from app.routes.categories import categories_bp
from app.routes.reports import reports_bp
from flask_cors import CORS
from app import models

def create_app():
  app = Flask(__name__)
  CORS(app, origins=[
        "http://localhost:5173",
        "https://personal-budget-1-gb0g.onrender.com"
  ])
  app.config.from_object(Config)

  db.init_app(app)
  migrate.init_app(app, db)

  app.register_blueprint(health_bp)
  app.register_blueprint(upload_bp)
  app.register_blueprint(transactions_bp)
  app.register_blueprint(categories_bp)
  app.register_blueprint(reports_bp)

  return app