# Q2-Chat Repository Structure

## Top-Level Directories

- `.expo/` – Expo configuration for React Native
- `.vscode/` – VS Code workspace settings
- `backend/` – Python/FastAPI app, models, Dockerfile, and requirements
- `frontend/` – React Native/Expo project (package.json, tsconfig.json)
- `supabase/` – Supabase CLI state, migrations, and init-scripts

### backend/

- `app/` – Python package containing:
  - `main.py` – FastAPI entrypoint
  - `models.py` – Pydantic/ORM models
  - `__init__.py` – package marker
- `requirements.txt` – Python dependencies
- `backend.dockerfile` – Dockerfile to containerize the backend

### frontend/

- `.expo/` – Expo configuration and build cache
- `app/` – your main React Native application code
- `assets/` – static assets (images, fonts, etc.)
- `components/` – reusable UI components
- `constants/` – shared constant values
- `hooks/` – custom React hooks
- `scripts/` – helper scripts for building or deploying
- `node_modules/` – installed JavaScript/TypeScript packages
- `.gitignore` – files to ignore in version control
- `app.json` – Expo project settings
- `eslint.config.js` – ESLint configuration
- `expo-env.d.ts` – TypeScript definitions for Expo environment variables
- `frontend.dockerfile` – Dockerfile to containerize the frontend
- `package.json` – project dependencies and npm scripts
- `package-lock.json` – exact dependency tree lockfile
- `tsconfig.json` – TypeScript configuration
- `README.md` – frontend-specific README

### supabase/

- `.branches/` – internal Supabase CLI branch state
- `.temp/` – temporary files used by Supabase CLI
- `init-scripts/` – SQL scripts run on project initialization
- `migrations/` – versioned database schema migrations
- `config.toml` – Supabase project configuration for the CLI

### Root-Level Files

- `docker-compose.yaml` – orchestrates backend, Supabase, and optional frontend services
- `.env` – local environment variables
- `Makefile` – shortcuts for common tasks (e.g. start, build, migrate)
- `README.md` – project overview and setup instructions
- `LICENSE` – project license
- `.gitignore` – files and folders ignored by Git
- `package.json` & `package-lock.json` – top-level JS/TS scripts and dependency lockfile
- `tsconfig.json` – TypeScript configuration for root scripts
- `testSupabase.js` – standalone script to validate Supabase connectivity
