from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from app.config import Config
from app.extensions import db, migrate, cache
from app.routes.health import health_bp
from app.routes.upload import upload_bp
from app.routes.transactions import transactions_bp
from app.routes.categories import categories_bp
from app.routes.reports import reports_bp
from app.routes.auth import auth_bp
from flask_cors import CORS
from app import models

def create_app():
  app = Flask(__name__)
  CORS(app, origins=[
        "http://localhost:5173",
        "https://personal-budget-1-gb0g.onrender.com"
  ], supports_credentials=True)
  app.config.from_object(Config)

  # Cache configuration - 5 minute timeout, max 100 entries per worker
  app.config["CACHE_TYPE"] = "SimpleCache"
  app.config["CACHE_DEFAULT_TIMEOUT"] = 300
  app.config["CACHE_THRESHOLD"] = 100

  db.init_app(app)
  migrate.init_app(app, db)
  cache.init_app(app)

  app.register_blueprint(health_bp)
  app.register_blueprint(upload_bp)
  app.register_blueprint(transactions_bp)
  app.register_blueprint(categories_bp)
  app.register_blueprint(reports_bp)
  app.register_blueprint(auth_bp)

  return app