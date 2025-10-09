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
COPY apps/api ./apps/api
CMD ["pnpm", "--filter", "@apps/api-gateway...", "dev"]

FROM base AS build
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --filter @apps/api-gateway... --frozen-lockfile
RUN pnpm --filter @apps/api-gateway... build
RUN pnpm deploy --filter @apps/api-gateway --prod /workspace/deploy

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace/deploy/ ./
RUN rm -rf src test Dockerfile README.md eslint.config.mjs tsconfig.json tsconfig.build.json nest-cli.json || true
EXPOSE 3001
CMD ["node", "dist/main.js"]
