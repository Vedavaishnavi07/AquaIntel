FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm run typecheck && npm test && npm run build
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5173 UPLOAD_DIR=/app/uploads
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p /app/uploads && chown node:node /app/uploads
COPY --from=build /app/dist ./dist
COPY --from=build /app/packages/database/migrations ./packages/database/migrations
USER node
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:5173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh","-c","node dist/server/scripts/migrate.js && node dist/server/apps/server/index.js"]
