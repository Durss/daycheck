# syntax=docker/dockerfile:1

# ---- Build stage: compile the Vue frontend (-> dist/) and the TS server (-> server/) ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install every dependency (dev deps are required to build)
COPY package.json package-lock.json ./
RUN npm ci

# Build frontend and server
COPY . .
RUN npm run build

# ---- Runtime stage: only what is needed to serve the app ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled server code + built frontend assets
# Config reads env "prod" => static files are served from ./public
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/dist ./public
# NB: no trailing newline — Config does an exact-string match on the env name
RUN printf prod > env.conf

# Run as the unprivileged user shipped with the node image
USER node

EXPOSE 3003
CMD ["node", "server/bootstrap.js"]
