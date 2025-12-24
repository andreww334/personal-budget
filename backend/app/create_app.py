from flask import Flask
from .extensions import db, migrate
from .routes.health import health_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    db.init_app(app)
    migrate.init_app(app, db)

    app.register_blueprint(health_bp)

    return app