# API App (Scaffold)

This app is a TypeScript Node.js starter for the backend service.

## Scripts
- npm run dev: Run API in watch mode
- npm run migrate: Apply SQL migrations in ./migrations
- npm run typecheck: Type-check source
- npm run build: Build to dist/
- npm run start: Run compiled output

## Database
- SQL migrations live in `migrations/`
- The app runs migrations automatically on startup
- For production, set `DATABASE_SSL=true` and keep `DATABASE_SSL_REJECT_UNAUTHORIZED=true` unless your provider explicitly requires otherwise
