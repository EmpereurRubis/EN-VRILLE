FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/content/package.json packages/content/package.json
RUN npm ci --workspace @en-vrille/api --workspace @en-vrille/web --workspace @en-vrille/shared --workspace @en-vrille/content --include-workspace-root
COPY apps/web apps/web
COPY packages/shared packages/shared
COPY packages/content/cinema packages/content/cinema
RUN npm run build --workspace @en-vrille/web

FROM nginx:1.28-alpine AS production
LABEL org.opencontainers.image.source="https://github.com/EmpereurRubis/EN-VRILLE"
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s CMD wget -q --spider http://127.0.0.1:8080/health-web || exit 1
