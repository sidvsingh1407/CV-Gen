# Build stage is not strictly needed since we build locally before Dockerizing
# but following multi-stage build best practices.
FROM node:22-slim AS builder

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies and build
RUN npm ci
RUN npm run build

# Production runtime stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
# Next.js telemetry opt-out
ENV NEXT_TELEMETRY_DISABLED=1

# Install LibreOffice minimum requirements for DOCX to PDF conversion
# fonts-liberation provides standard fonts like Arial, Times New Roman, Courier New equivalents
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    fonts-liberation \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Add a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set up appropriate permissions for LibreOffice and the app
# LibreOffice needs a writable home directory for its user profile
RUN mkdir -p /home/nextjs/.config/libreoffice && \
    chown -R nextjs:nodejs /home/nextjs

# Copy Next.js standalone output and static assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the non-root user
USER nextjs

# The application port (3000 by default)
EXPOSE 3000

# Ensure the server binds to 0.0.0.0
ENV HOST=0.0.0.0
ENV PORT=3000

# Start the Next.js application using the standalone server
CMD ["node", "server.js"]
