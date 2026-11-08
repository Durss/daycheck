# syntax=docker/dockerfile:1

# ---- Build stage: compile the Vue frontend (-> dist/) and the TS server (-> server/) ----
FROM node:24-alpine AS builder
WORKDIR /app

# Install every dependency (dev deps are required to build)
COPY package.json package-lock.json ./
RUN npm ci

# Build frontend and server
COPY . .
RUN npm run build

# ---- Runtime stage: only what is needed to serve the app ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Apply pending OS security patches, install production dependencies only, then
# drop the package managers shipped with the base image (npm, corepack, yarn):
# the app only needs `node` at runtime and their bundled dependencies are a
# recurring source of CVEs
COPY package.json package-lock.json ./
RUN apk upgrade --no-cache \
	&& npm ci --omit=dev && npm cache clean --force \
	&& rm -rf /usr/local/lib/node_modules /opt/yarn-* \
		/usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
		/usr/local/bin/yarn /usr/local/bin/yarnpkg

# Compiled server code + built frontend assets
# Config reads env "prod" => static files are served from ./public
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/dist ./public
# NB: no trailing newline — Config does an exact-string match on the env name
RUN printf prod > env.conf

# Calendars are stored as JSON files in /app/data. Mount a volume there
# (see docker-compose.yml) so they survive image updates and container restarts.
# The folder is created here so a fresh named volume inherits the "node" owner.
ENV DATA_PATH=/app/data
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]

# Run as the unprivileged user shipped with the node image
USER node

EXPOSE 3003
CMD ["node", "server/bootstrap.js"]
