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
# If better-sqlite3 or node-gyp is in deps, uncomment next line:
# RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*
RUN npm install --omit=dev

# --------- Final image ---------
FROM node:20-bullseye-slim AS runtime
WORKDIR /app

# Copy backend code (keep subfolder) and its node_modules
COPY backend ./backend
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules

# Copy built frontend + public assets
RUN mkdir -p /app/public /app/frontend/build
COPY --from=build-frontend /app/frontend/build/ /app/frontend/build/
COPY frontend/public/ ./public/

# Runtime env — seed at runtime into the VOLUME, not during build
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/catalog.db

# Run from backend dir
WORKDIR /app/backend

# Make sure the start script is executable
RUN chmod +x /app/backend/start.sh

# IMPORTANT: run the script with bash (not node)
CMD ["bash", "-lc", "./start.sh"]
