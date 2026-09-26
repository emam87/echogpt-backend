# EchoGPT Backend

EchoGPT Backend is a production-grade NestJS REST API powered by PostgreSQL, Prisma ORM, and Swagger/OpenAPI documentation. Designed as the backend service for the EchoGPT Chrome Extension, it delivers secure multi-tenant AI provider integration (OpenAI, Claude, Gemini), stateful JWT session management, subscription tier control, cached web search capabilities, and a full-featured Admin dashboard.

---

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (TypeScript)
- **Database & ORM**: PostgreSQL & [Prisma ORM](https://www.prisma.io/)
- **Security & Cryptography**: Passport JWT, Argon2 (Password hashing), AES-256-GCM (API Key encryption)
- **Rate Limiting & Protection**: `@nestjs/throttler`
- **Documentation**: Swagger / OpenAPI 3.0 (`@nestjs/swagger`)
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose

---

## Setup Instructions

### 1. Prerequisites
Ensure you have Node.js (v18+), npm, and Docker installed.

### 2. Clone and Install Dependencies
```bash
git clone <repository-url>
cd echogpt-backend
npm install
```

### 3. Start Database Service
Spin up the local PostgreSQL container using Docker Compose:
```bash
docker compose up -d
```

### 4. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```

Generate secure 32-byte (64 hex characters) keys for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY` by running the following command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Update your `.env` file with these generated values.

### 5. Database Migration & Seeding
Run Prisma migrations to construct the database schema and execute the seed script:
```bash
npx prisma migrate dev
npx prisma db seed
```

### 6. Start Development Server
```bash
npm run start:dev
```
The server will start at `http://localhost:3000`.

---

## Environment Variables Table

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | HTTP server port | `3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://echogpt:echogpt@localhost:5433/echogpt?schema=public` |
| `JWT_ACCESS_SECRET` | Yes | Secret key for signing access JWTs | `64-character hex string` |
| `JWT_REFRESH_SECRET`| Yes | Secret key for signing refresh JWTs | `64-character hex string` |
| `JWT_ACCESS_EXPIRES` | Yes | Expiration duration for access tokens | `15m` |
| `JWT_REFRESH_EXPIRES`| Yes | Expiration duration for refresh tokens | `7d` |
| `ENCRYPTION_KEY` | Yes | 64-character hex key (32 bytes) for AES-256-GCM encryption of provider keys | `64-character hex string` |
| `MOCK_AI_RESPONSE` | No | Set to `true` to return mock responses without calling real LLM APIs (default: `true`) | `true` |
| `MOCK_SEARCH` | No | Set to `true` to return mock search results without paid search API keys (default: `true`) | `true` |

---

## API Documentation

Interactive Swagger documentation is available once the server is running:

- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)

All endpoints requiring authentication include `@ApiBearerAuth()` in Swagger and expect a valid Bearer token in the `Authorization` header.

---

## Default Seeded Accounts

The database seed populates initial role definitions (`USER`, `ADMIN`), plan tiers (`FREE`, `PREMIUM`), and demo accounts:

| Email | Password | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `admin@echogpt.com` | `Admin123!` | `ADMIN` | Full access to `/admin/*` management endpoints |
| `user@echogpt.com` | `User123!` | `USER` | Standard user testing |

> [!CAUTION]
> Default seeded credentials are provided solely for development and evaluation. They must be updated or removed before deploying to production environments.

---

## Testing Notes & Mocking Flags

Due to external API costs during development, two environment flags are provided:

- `MOCK_AI_RESPONSE=true`: Bypasses external HTTP calls to OpenAI, Claude, or Gemini APIs while executing the complete request lifecycle—including usage limit validation (`assertWithinLimit`), active provider selection, conversation loading, message persistence, and `ApiUsageLog` creation.
- `MOCK_SEARCH=true`: Bypasses external search engine API calls while caching results in the `WebSearch` database table and generating usage logs.

To test live external AI providers, configure a valid provider API key via `POST /api/v1/providers` and set `MOCK_AI_RESPONSE=false` in `.env`.

---

## Architectural Assumptions

1. **Mocked Subscriptions**: Plan upgrades and downgrades switch active subscription records within a Prisma transaction (`CANCELED` for prior active record, `ACTIVE` for new record) without integrating a real payment processor.
2. **Stateful Session Revocation**: Every access token contains a session ID (`sid`). `JwtStrategy` validates against the `Session` database record on every request. Logout and password changes immediately revoke sessions (`revokedAt = new Date()`), invalidating all outstanding access and refresh tokens.
3. **Provider Ownership**: System providers (`userId = null`) created by administrators are accessible to all users. Custom user providers (`userId = user.id`) are strictly private to their owner.
4. **Usage Limit Tracking**: Daily limit checks apply exclusively to successful (`statusCode < 400`) requests made to `/chat` and `/search` endpoints and automatically reset at UTC midnight.

---

## Known Trade-offs

- **Transient Key Decryption**: When listing AI providers (`GET /providers` or `GET /admin/providers`), masked keys (`****1234`) are generated dynamically by transiently decrypting `encryptedApiKey` via `CryptoService` rather than persisting an additional `keyLastFour` database column. This minimizes schema complexity while maintaining key confidentiality.

---

## Security Note

- In a previous commit, a hardcoded fallback encryption key was temporarily present in `prisma/seed.ts`. This was completely removed, and all environment secrets (`.env`) were rotated as a precaution.

---

## Running Tests

Execute the Jest test suite:

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

---

## Project Structure Overview

```
src/
├── admin/          # Admin dashboard, stats, user roles, analytics, health checks
├── auth/           # JWT authentication, signup, login, refresh, logout
├── chat/           # Conversational AI logic, provider adapters (OpenAI, Claude, Gemini)
├── common/         # Guards (JwtAuth, Roles), Decorators (@Roles, @CurrentUser), CryptoService
├── prisma/         # Prisma client module and service
├── providers/      # AI Provider CRUD operations & API key encryption
├── search/         # Web search provider adapter, query caching, history
├── subscriptions/  # Subscription status, plan upgrades, downgrades
├── usage/          # Daily usage limit enforcement & ApiUsageLog tracking
└── users/          # Profile retrieval and password updates
```
