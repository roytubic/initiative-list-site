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
RUN npm install --omit=dev

# --------- Final image ---------
FROM node:20-bullseye-slim
WORKDIR /app

# Backend code (server.js, routes, etc.)
COPY backend ./

# Backend node_modules from deps stage
COPY --from=backend-deps /app/backend/node_modules ./node_modules

# Ensure dirs exist
RUN mkdir -p /app/public /app/db /frontend/build

# Put the React build where the server expects it: /frontend/build
COPY --from=build-frontend /app/frontend/build/ /frontend/build/

# Copy all public assets used by the app (images, backgrounds, etc.)
COPY frontend/public/ ./public/

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
