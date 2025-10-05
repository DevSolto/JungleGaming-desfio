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
COPY apps/notifications ./apps/notifications
CMD ["pnpm", "--filter", "@apps/notifications-service...", "dev"]
