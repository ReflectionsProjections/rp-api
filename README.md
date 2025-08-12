# API for Reflections | Projections

This is the backend API service for Reflections | Projections 2025, built with Node.js, Express, and TypeScript. It includes a complete self-hosted Supabase infrastructure for local development.

## Quick Start

1. **Install dependencies:**

    ```bash
    yarn
    ```

2. **Set up environment variables:**

    - Reach out to your Dev Chairs for the `.env` file
    - Place it in the root of the `rp-api` directory

3. **Start the full development environment:**
    ```bash
    docker compose up --build
    ```

## Docker Compose Setup

The API includes several Docker Compose configurations for different development scenarios:

### Full Development Environment

**`docker-compose.yml`** - Spins up ALL services required locally (api, db, kong, studio, rest, meta)

```bash
docker compose up --build
```

### API Only

**`docker-compose.api.yml`** - Only spins up the API service (can configure to connect to prod database with env)

```bash
docker compose -f docker-compose.api.yml up --build
```

### Database Services Only

**`docker-compose.db.yml`** - Only spins up the db-related services (db, kong, studio, rest, meta)

```bash
docker compose -f docker-compose.db.yml up --build
```

### Testing Environment

**`docker-compose.test.yml`** - Only spins up the basic db services required for testing (db, kong, rest)

```bash
# Run tests in Docker
yarn test:docker

# Or manually start test environment
docker compose -f docker-compose.test.yml up --build
```

## Database Management

The database is automatically initialized with the scripts in `docker/init-scripts/`. These scripts run in order:

1. **`00-roles.sql`** - Creates Supabase roles and users (anon, authenticated, service_role, etc.)
2. **`01-schema.sql`** - Creates database schema, tables, and types
3. **`02-grants.sql`** - Sets up permissions for all roles

You can modify the database schema in `docker/init-scripts/01-schema.sql`.

## Development Scripts

| Task                           | Command            |
| ------------------------------ | ------------------ |
| Install dependencies           | `yarn`             |
| Start development server       | `yarn dev`         |
| Start production server        | `yarn start`       |
| Run tests                      | `yarn test`        |
| Run tests in Docker            | `yarn test:docker` |
| Lint code                      | `yarn lint`        |
| Format code                    | `yarn format`      |
| Build project                  | `yarn build`       |
| Verify (build + lint + format) | `yarn verify`      |
| View API logs                  | `yarn logs`        |
| Enter API container            | `yarn shell`       |
| Restart API service            | `yarn restart`     |

## Service URLs

When running locally with Docker Compose:

| Service         | URL                   | Description                   |
| --------------- | --------------------- | ----------------------------- |
| API             | http://localhost:3000 | Main API endpoints            |
| Supabase Studio | http://localhost:8000 | Database management interface |
| Kong Gateway    | http://localhost:8000 | API gateway                   |
| PostgREST       | http://localhost:3001 | REST API for PostgreSQL       |

## Development Workflow

### Local Development (without Docker)

```bash
# Install dependencies
yarn

# Start development server
yarn dev
```

### Docker Development

```bash
# Start full environment
docker compose up --build

# In another terminal, view logs
yarn logs

# Enter the API container for debugging
yarn shell
```

### Testing

```bash
# Run tests locally
yarn test

# Run tests in Docker environment
yarn test:docker
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 5432, and 8000 are available
2. **Environment variables**: Ensure your `.env` file is properly configured
3. **Database connection**: Check that the database service is healthy before starting the API

### Useful Commands

```bash
# View all container logs
docker compose logs -f

# View specific service logs
docker compose logs -f api

# Restart a specific service
docker compose restart api

# Clean up containers and volumes
docker compose down -v
```

## Contributing

1. Follow the existing code style (use `yarn format` to format code)
2. Write tests for new features
3. Run `yarn verify` before committing
4. Ensure all tests pass with `yarn test:docker`

## Questions or Issues?

Feel free to open a PR or ask the team! For environment setup, reach out to your Dev Chairs.
