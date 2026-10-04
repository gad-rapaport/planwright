# syntax=docker/dockerfile:1.7

# ---- build the static site ----
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY index.html vite.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build \
 # Precompress text assets once so nginx serves them with gzip_static instead of compressing per request.
 && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.webmanifest' \) \
      -size +512c -exec gzip -9 -k -n {} +

# ---- runtime: unprivileged nginx (uid 101), static files only ----
FROM nginxinc/nginx-unprivileged:1.30-alpine-slim AS runtime
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
COPY deploy/nginx/nginx.conf /etc/nginx/nginx.conf
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
