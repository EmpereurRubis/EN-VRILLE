FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/content/package.json packages/content/package.json
RUN npm ci --workspace @en-vrille/api --workspace @en-vrille/web --workspace @en-vrille/shared --workspace @en-vrille/content --include-workspace-root
COPY apps/api apps/api
COPY packages packages
RUN npm run build --workspace @en-vrille/api

FROM node:22-alpine AS production
RUN apk add --no-cache ffmpeg
LABEL org.opencontainers.image.source="https://github.com/EmpereurRubis/EN-VRILLE"
ENV NODE_ENV=production PORT=3001 DATA_DIR=/app/data MEDIA_DIR=/app/packages/content/media
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/content/package.json packages/content/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace @en-vrille/api --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/content/media ./packages/content/media
COPY --from=build /app/packages/content/cinema/LICENSE.md ./packages/content/media/cinema/LICENSE.md
COPY --from=build /app/apps/api/migrations ./apps/api/migrations
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3001/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/index.js"]
