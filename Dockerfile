# Multi-stage Docker build for AllocAid TA Management System

# Stage 1: Frontend Build (React + Vite)
FROM node:18-alpine AS frontend-builder 
# can be changed to later version: FROM node:24-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for better caching
COPY app/src/frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY app/src/frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Backend (Deno)
FROM denoland/deno:2.3.5 AS backend

WORKDIR /app

# Install PostgreSQL client tools for database connectivity checks
USER root
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*
USER deno

# Copy dependency files first for better caching
COPY app/deps.ts ./deps.ts
COPY deno.json ./
COPY import_map.json ./

# Change ownership to deno user and cache dependencies
USER root
RUN chown -R deno:deno /app
USER deno
RUN deno cache deps.ts

# Copy scripts and set permissions
COPY scripts/ /app/scripts/
USER root
RUN chmod +x /app/scripts/*.sh
USER deno

# Copy backend and database source
COPY app/src/backend/ ./src/backend/
COPY app/src/database/ ./src/database/

# Copy main server file (assuming it's in app root or app/src)
COPY app/server.ts ./server.ts

# Cache all dependencies including server.ts
RUN deno cache server.ts

# Copy built frontend from previous stage to serve statically
COPY --from=frontend-builder /app/frontend/dist ./public

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD deno eval "fetch('http://localhost:8000/health').then(r => r.ok ? Deno.exit(0) : Deno.exit(1)).catch(() => Deno.exit(1))"

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "--allow-write", "server.ts"]