FROM node:26-bookworm-slim AS dependencies

ARG PNPM_VERSION=12.15.0
ENV HUSKY=0
WORKDIR /app

RUN npm install --global pnpm@${PNPM_VERSION}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build
# The application prepare script requires Husky, which is a dev dependency.
# Pruning does not need to rerun lifecycle scripts.
RUN pnpm prune --prod --ignore-scripts

FROM node:26-bookworm-slim AS production
ENV NODE_ENV=production \
    PORT=3210 \
    ENVIRONMENT=PROD \
    LOG_MODE=log4js \
    LOG_LEVEL=INFO \
    LOG_DIR=/app/logs
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /app/logs && chown node:node /app/logs

USER node
EXPOSE 3210
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health/live', { signal: AbortSignal.timeout(4000) }).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
