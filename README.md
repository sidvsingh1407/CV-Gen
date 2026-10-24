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
