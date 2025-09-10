# --------- Build frontend ---------
FROM node:20-bullseye-slim AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# --------- Install backend deps (prod only) ---------
FROM node:20-bullseye-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
# If better-sqlite3 is in deps and needs tools, add build essentials here.
# RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*
RUN npm install --omit=dev

# --------- Final image ---------
FROM node:20-bullseye-slim
WORKDIR /app

# Copy backend code into /app/backend  (KEEP THE SUBFOLDER)
COPY backend ./backend

# Bring backend node_modules alongside it
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules

# Optional: CLI sqlite (handy for debugging in a shell)
# RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 && rm -rf /var/lib/apt/lists/*

# Seed config: bake a pre-seeded DB into the image
ENV DB_PATH=/app/backend/db/catalog.db
ENV FORCE_RESEED=1
RUN node backend/db/seedCatalog.js

# Ensure dirs; copy frontend build + public assets
RUN mkdir -p /app/public /app/frontend/build
COPY --from=build-frontend /app/frontend/build/ /app/frontend/build/
COPY frontend/public/ ./public/

ENV NODE_ENV=production
EXPOSE 3000

# Run the server from the backend folder
WORKDIR /app/backend
EXPOSE 3000
CMD ["./start.sh"]