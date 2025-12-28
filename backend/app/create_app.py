from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from app.config import Config
from app.extensions import db, migrate
from app.routes.health import health_bp
from app import models
from flask_cors import CORS

def create_app():
  app = Flask(__name__)
  CORS(app, origins=[
        "http://localhost:5173",
        "https://your-frontend.vercel.app"
  ])
  app.config.from_object(Config)

  db.init_app(app)
  migrate.init_app(app, db)

  from app import models
  app.register_blueprint(health_bp)


  return app