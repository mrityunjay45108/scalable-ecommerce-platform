# =========================================================================
# Stage 1: Base & Dependencies
# =========================================================================
FROM node:20-alpine AS dependencies

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package manifests across all monorepo packages and apps
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# =========================================================================
# Stage 2: Builder
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages ./packages
COPY --from=dependencies /app/apps ./apps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy source codes
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Generate Prisma Client
RUN cd packages/database && pnpm run db:generate

# Build dependencies and backend API
RUN pnpm --filter=@ecommerce/config build
RUN pnpm --filter=@ecommerce/types build
RUN pnpm --filter=@ecommerce/database build
RUN pnpm --filter=@ecommerce/api build

# =========================================================================
# Stage 3: Production Runner
# =========================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV API_PREFIX=api/v1

RUN apk add --no-cache wget libc6-compat

# Security: Create non-root system user & group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy root node_modules and built application files
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json

USER nestjs

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
