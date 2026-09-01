# Getting Started with NovaStore

Follow these steps to set up the development environment from scratch.

## Prerequisites

- **Node.js**: >= 20.x (Recommended: Node 22 LTS)
- **pnpm**: >= 9.x (`npm install -g pnpm` or `corepack enable`)
- **Docker & Docker Compose**: (For local PostgreSQL, Redis, and Mailpit)

## Quick Start

### 1. Clone & Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

### 3. Start Infrastructure Services

Start PostgreSQL, Redis, and Mailpit containers:

```bash
pnpm docker:up
```

Verify services are healthy:
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **Mailpit Web UI**: `http://localhost:8025`

### 4. Setup Database & Seed Initial Data

Generate the Prisma client, push schema definitions to PostgreSQL, and seed initial products and admin accounts:

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### 5. Start Development Servers

Start all applications in parallel using Turborepo:

```bash
pnpm dev
```

- **Next.js Web**: `http://localhost:3000`
- **NestJS API**: `http://localhost:4000`
- **API Swagger Docs**: `http://localhost:4000/api/docs`

---

## Default Seed Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@novastore.com` | `Password123!` |
| Customer | `customer@novastore.com` | `Password123!` |
