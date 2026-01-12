# Personal Budget App

Full-stack personal budget application for tracking income and expenses.

## Tech Stack

- **Backend**: Python 3.13 / Flask / PostgreSQL (Supabase) / SQLAlchemy
- **Frontend**: React 19 / TypeScript / Vite

## Development Commands

### Backend
```bash
cd backend
source venv/bin/activate
python run.py          # Run dev server
pytest                 # Run tests
```

### Frontend
```bash
cd frontend
npm run dev            # Start dev server
npm run build          # Build for production
npm run lint           # Run ESLint
```

## Code Style

### React/TypeScript
- Use functional components with hooks only (no class components)
- Follow ESLint configuration

### Python
- Always use type hints
- Follow Flask application factory pattern

### Money Handling
- Store all monetary amounts as **cents** (integers) to avoid floating point issues
- Example: $10.50 should be stored as `1050`

### API Design
- Follow RESTful conventions
- Use proper HTTP verbs (GET, POST, PUT, DELETE)
- Return appropriate status codes
- Keep error messages simple

## Git Workflow

- Always ask before making commits
- Use simple, descriptive commit messages

## Testing

- **Backend**: pytest
- **Frontend**: Not configured yet

## Security

- Never commit `.env` files
- Use `.env.example` for environment variable templates
- Database URL stored in `DATABASE_URL` environment variable

## Project Structure

```
backend/
  app/
    create_app.py     # Flask app factory
    models.py         # SQLAlchemy models
    routes/           # API endpoints
  migrations/         # Alembic migrations
  run.py              # Dev entry point

frontend/
  src/
    main.tsx          # React entry point
    App.tsx           # Root component
```
