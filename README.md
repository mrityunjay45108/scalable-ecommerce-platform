# NovaStore - Production-Ready Modular E-Commerce Platform

A scalable, high-performance, modular full-stack e-commerce platform built as a clean monorepo using Next.js 15, NestJS 11, PostgreSQL, Prisma ORM, Redis, and Tailwind CSS + shadcn/ui.

---

## Architecture Overview

```
ecommerce-platform-monorepo/
├── apps/
│   ├── web/                 # Next.js 15 App Router Frontend (Tailwind + shadcn/ui)
│   └── api/                 # NestJS 11 Backend API (Modular Architecture)
├── packages/
│   ├── ui/                  # Reusable UI component library (shadcn/ui base)
│   ├── config/              # Shared application constants and configuration
│   ├── types/               # Shared domain interfaces, DTOs, and enums
│   ├── database/            # Prisma ORM schema, client, migrations & seeds
│   ├── eslint-config/       # Unified ESLint presets (base, next, nest)
│   └── tsconfig/            # Shared TypeScript configs (base, nextjs, nest)
├── infra/
│   └── docker/              # Docker Compose (PostgreSQL 17, Redis 7, Mailpit)
├── docs/                    # Architecture, setup, and API documentation
├── turbo.json               # Turborepo task pipeline orchestration
├── pnpm-workspace.yaml      # pnpm workspace definition
└── package.json             # Root monorepo scripts
```

---

## Tech Stack

| Layer | Technology | Key Features |
|---|---|---|
| **Frontend** | [Next.js 15](https://nextjs.org/) + [React 19](https://react.dev/) | App Router, Server/Client Components, Tailwind CSS, shadcn/ui, TanStack Query, Zustand |
| **Backend** | [NestJS 11](https://nestjs.com/) | Modular DDD architecture, Passport JWT auth, Throttler, Class-Validator, Swagger OpenAPI |
| **Database** | [PostgreSQL 17](https://www.postgresql.org/) + [Prisma ORM 6](https://www.prisma.io/) | Relational modeling, migrations, type-safe queries, relation indexing |
| **Caching** | [Redis 7](https://redis.io/) (ioredis) | Session management, product/category caching, fast lookup |
| **Monorepo Engine** | [pnpm](https://pnpm.io/) + [Turborepo](https://turbo.build/) | Workspace package linking, pipeline caching, parallel builds |

---

## Getting Started

### Prerequisites

- **Node.js**: >= 20.x (Recommended: Node 22 LTS)
- **pnpm**: >= 9.x (`npm install -g pnpm` or `corepack enable`)
- **Docker & Docker Compose**: For local PostgreSQL, Redis, and Mailpit services

### 1. Installation

```bash
# Clone the repository and install dependencies across all workspaces
pnpm install
```

### 2. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env
```

Review and adjust `.env` variables if necessary (database credentials, JWT secrets, Redis connection).

### 3. Start Infrastructure (PostgreSQL, Redis, Mailpit)

```bash
# Start Docker containers in detached mode
pnpm docker:up
```

- **PostgreSQL**: `localhost:5432` (`ecommerce_db`)
- **Redis**: `localhost:6379`
- **Mailpit Web UI**: `http://localhost:8025`

### 4. Database Setup & Seed

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema to PostgreSQL database
pnpm db:push

# Seed database with sample categories, products, coupons, and test users
pnpm db:seed
```

### 5. Run Development Servers

```bash
# Start both Web and API in development mode with Turborepo
pnpm dev
```

- **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **Swagger Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run all applications concurrently in development mode |
| `pnpm dev:web` | Run only the Next.js frontend application |
| `pnpm dev:api` | Run only the NestJS backend API |
| `pnpm build` | Build all packages and applications for production |
| `pnpm lint` | Lint all workspaces with ESLint |
| `pnpm type-check` | Run TypeScript typechecking across the entire monorepo |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:push` | Push schema changes directly to PostgreSQL |
| `pnpm db:migrate` | Run Prisma database migrations |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:studio` | Open Prisma Studio database GUI |
| `pnpm docker:up` | Spin up PostgreSQL, Redis, and Mailpit containers |
| `pnpm docker:down` | Stop and tear down local Docker containers |
| `pnpm docker:logs` | Tail Docker container logs |
| `pnpm clean` | Remove build outputs and caches |

---

## Default Test Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@novastore.com` | `Password123!` |
| **Customer** | `customer@novastore.com` | `Password123!` |

---

## License

This project is private and proprietary.
