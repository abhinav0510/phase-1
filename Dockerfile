# Builds the production image. Only NEXT_PUBLIC_* values go in at build time, and those
# are public anyway. Server secrets arrive at run time from deploy/app.env.
FROM node:26.13-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26.13-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node node_modules/next/dist/bin/next build

FROM node:26.13-bookworm-slim AS run
WORKDIR /app
ARG APP_VERSION=dev
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    REQUIRE_ENV=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_VERSION=$APP_VERSION
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app --no-create-home app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
RUN mkdir -p .next/cache && chown app:app .next/cache
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
