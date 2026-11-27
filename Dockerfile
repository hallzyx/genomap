# Genomap: one image, two services (the web app and the MCP server).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY web ./web
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY mcp ./mcp
COPY assets ./assets
COPY --from=build /app/dist ./dist
# The SQLite database lives here; mount a volume so it survives redeploys.
RUN mkdir -p .pilot-data && chown node:node .pilot-data
USER node
EXPOSE 4173 4174
CMD ["node", "server/start.js"]
