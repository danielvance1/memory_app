# syntax=docker/dockerfile:1
#
# Builds ONE image that contains the API and the built React app.
# Three stages: build the client, build the server, then assemble a small
# runtime image with only what's needed to run.

# ---- Stage 1: build the React client ---------------------------------------
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: compile the TypeScript server --------------------------------
FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# ---- Stage 3: runtime ------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only (no TypeScript, tsx, or type packages).
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# The compiled server and the built client. The server finds the client at
# ../../client/dist relative to server/dist, so keep this folder layout.
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=client-build /app/client/dist ./client/dist

USER node
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
