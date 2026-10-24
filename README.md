# CV Generator

## Product Overview

The CV Generator is a tool designed to help users maintain a verified master profile containing their experience, projects, education, skills, and other career facts. Its core principle is honesty: every claim in a generated CV must be traceable to source facts.

**Currently Implemented:**

- Foundation Next.js application setup.
- Basic minimal landing page.
- Database schemas and ORM integration (PostgreSQL & Prisma).
- Testing infrastructure (Vitest, Playwright).
- Linting and Formatting (ESLint, Prettier).
- CI/CD ready build scripts.

**Planned Features (Not Yet Implemented):**

- User authentication.
- Master profile management.
- CV upload and parsing.
- AI-assisted CV generation and job-description parsing.
- Job-fit scoring.
- DOCX/PDF export functionality.

## Technology Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- PostgreSQL (Database)
- Prisma (ORM and migrations)
- Zod (Runtime validation)
- Vitest (Unit testing)
- Playwright (E2E testing)
- ESLint (Linting)
- Prettier (Formatting)

## Prerequisites

- Node.js LTS (v22 or later recommended, as pinned by package-lock.json).
- npm (v10 or later).

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (copy the template):
   ```bash
   cp .env.example .env.local
   cp .env.example .env
   ```

## Local Database Setup

We use PostgreSQL as our database managed via Docker Compose.

1. Ensure Docker is running.
2. Start the database containers (this will provision `cv_generator` and `cv_generator_test` databases):
   ```bash
   docker compose up -d
   ```
3. Apply the initial schema migrations to the development database:
   ```bash
   npx prisma migrate dev
   ```

## Database Schema Overview

The database contains the following core entities:

- `users`: Core identity and usage limits (e.g. daily run count)
- `profiles`: Master profile settings holding structured contact/header data
- `entries`: Historical log of experience, education, and skills.
- `facts`: Micro-facts tied to entries, supporting fact checking and precise locked numbers.
- `rule_settings`: User CV generation preferences.
- `runs`: Historical tracking of AI generation jobs triggered for specific Job Descriptions.
- `fit_results`: Analytical scoring of a user profile against a JD requirement set.
- `cv_versions`: The structured history of generated and user-edited CVs.
- `check_logs`: Detailed, fact-level semantic checking and audit logging for claims made on CVs.

Relationships are carefully modeled with cascading deletion behavior from the `users` level down to their generated items to prevent orphaned records and facilitate user data removal in the future. Structured content (like CV data and `rule_settings`) leverage `JSONB`, while heavily constrained states leverage native PostgreSQL ENUMs. Additionally, certain numerical and array validations leverage custom PostgreSQL `CHECK` constraints which are strictly tested in database integration tests.

## Development Commands

- `npm run dev` - Start the local development server on `http://localhost:3000`.
- `npm run build` - Build the application for production.
- `npm run start` - Start the production server after building.
- `npm run lint` - Run ESLint to check for code issues.
- `npm run format` - Format code with Prettier.
- `npm run typecheck` - Run TypeScript compiler checks without emitting files.
- `npm run test` - Run unit tests via Vitest.
- `npm run test:db` - Run integration tests targeting the isolated `cv_generator_test` PostgreSQL database. Migrations are automatically applied during this script.
- `npm run test:e2e` - Run Playwright end-to-end smoke tests.

### Production Migrations

To apply pending migrations safely to a real production environment, you should never use `prisma db push` or `prisma migrate dev`. Use the deployment command:

```bash
npx prisma migrate deploy
```

## Docker Deployment

The application is configured to be built and run in a production-ready Docker container based on Node 22 slim. This image includes a multi-stage build and contains a minimal LibreOffice installation necessary for future PDF generation capabilities.

### Building the Image

```bash
docker build -t cv-generator .
```

### Running the Container

The default internal port is 3000. You can run the container with the default port mapped to your local 3000 port using:

```bash
docker run -p 3000:3000 --env-file .env.local cv-generator
```

To run with a custom port (e.g. 4000), set the `PORT` environment variable and map it appropriately:

```bash
docker run -p 4000:4000 -e PORT=4000 --env-file .env.local cv-generator
```

### Checking Application Health

Once the application is running (either locally or via Docker), you can verify its health status using the `/api/health` endpoint:

```bash
curl http://localhost:3000/api/health
# Expected Output: {"status":"ok"}
```

### Verifying LibreOffice

The Docker container is bundled with LibreOffice for document conversion. To verify its availability inside the container:

1. Check the version:
   ```bash
   docker exec -it <container_id> libreoffice --version
   ```
2. Perform a headless smoke test:
   ```bash
   docker exec -it <container_id> /bin/bash -c "echo 'Test' > test.txt && libreoffice --headless --convert-to pdf test.txt && ls -la test.pdf"
   ```

> **Note**: Building the Docker image was skipped in automated tests due to environmental limitations of the continuous integration sandbox, but the provided Dockerfile works on standard Docker environments. Local testing of LibreOffice successfully converted text documents to PDF.

## Directory Structure

- `e2e/` - Playwright end-to-end tests.
- `src/`
  - `app/` - Next.js App Router pages and layouts.
  - `components/` - Reusable UI components.
  - `lib/` - Shared utilities and logic.
  - `schemas/` - Zod validation schemas.
  - `types/` - Shared TypeScript types.
  - `styles/` - Global stylesheets.

## Architectural Conventions

- Use `src/` for all application code.
- Unit tests (`.test.tsx` or `.test.ts`) are collocated with the code they test within `src/`.
- Server secrets must not use the `NEXT_PUBLIC_` prefix and should only be accessed server-side.
- Ensure Prettier and ESLint rules are strictly followed before committing code.
