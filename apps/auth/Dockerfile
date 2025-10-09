# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /workspace
ENV PNPM_HOME="/pnpm"
ENV PNPM_STORE_DIR="/pnpm/store"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && corepack prepare pnpm@9.0.0 --activate

FROM base AS dev
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/auth ./apps/auth
CMD ["pnpm", "--filter", "@apps/auth-service...", "dev"]

FROM base AS build
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/auth ./apps/auth
RUN pnpm install --filter @apps/auth-service... --frozen-lockfile
RUN pnpm --filter @apps/auth-service... build
RUN pnpm deploy --filter @apps/auth-service --prod /workspace/deploy

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace/deploy/ ./
RUN rm -rf src test Dockerfile README.md eslint.config.mjs tsconfig.json tsconfig.build.json || true
EXPOSE 4010
CMD ["node", "dist/main.js"]
