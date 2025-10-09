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
COPY apps/tasks ./apps/tasks
CMD ["pnpm", "--filter", "@apps/tasks-service...", "dev"]

FROM base AS build
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/tasks ./apps/tasks
RUN pnpm install --filter @apps/tasks-service... --frozen-lockfile
RUN pnpm --filter @apps/tasks-service... build
RUN pnpm deploy --filter @apps/tasks-service --prod /workspace/deploy

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace/deploy/ ./
RUN rm -rf src test Dockerfile README.md eslint.config.mjs tsconfig.json tsconfig.build.json || true
EXPOSE 3003
CMD ["node", "dist/main.js"]
