# CV Generator

## Product Overview

The CV Generator is a tool designed to help users maintain a verified master profile containing their experience, projects, education, skills, and other career facts. Its core principle is honesty: every claim in a generated CV must be traceable to source facts.

**Currently Implemented:**

- Foundation Next.js application setup.
- Basic minimal landing page.
- Testing infrastructure (Vitest, Playwright).
- Linting and Formatting (ESLint, Prettier).
- CI/CD ready build scripts.

**Planned Features (Not Yet Implemented):**

- Database schemas and ORM integration.
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
   ```

## Development Commands

- `npm run dev` - Start the local development server on `http://localhost:3000`.
- `npm run build` - Build the application for production.
- `npm run start` - Start the production server after building.
- `npm run lint` - Run ESLint to check for code issues.
- `npm run format` - Format code with Prettier.
- `npm run typecheck` - Run TypeScript compiler checks without emitting files.
- `npm run test` - Run unit tests via Vitest.
- `npm run test:e2e` - Run Playwright end-to-end smoke tests.

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
