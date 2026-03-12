# Docker Setup Guide

This project uses Docker Compose to run all required services: PostgreSQL, Redis, Meilisearch, and Minio.

## Services

| Service | Version | Ports | Description |
|---------|---------|-------|-------------|
| PostgreSQL | 18.3 | 5433 | Primary database |
| Redis | 8.6.0 | 6380 | Cache and session store |
| Meilisearch | 1.8 | 7700 | Full-text search engine |
| Minio | RELEASE.2025-10-15 | 9000, 9001 | S3-compatible object storage |

## Quick Start

### 1. Copy Environment Variables

```bash
cp .env.example .env
```

### 2. Update `.env` File

Edit the `.env` file and update the passwords:

```env
# Update these with secure passwords
POSTGRES_PASSWORD=your_secure_password
REDIS_PASSWORD=your_redis_password
MEILISEARCH_MASTER_KEY=your_meilisearch_master_key
MINIO_ROOT_PASSWORD=your_minio_secure_password
```

### 3. Start All Services

```bash
docker-compose -f dht-docker-compose.yml up -d
```

### 4. Verify Services are Running

```bash
docker-compose -f dht-docker-compose.yml ps
```

All services should show as "Up" or "Up (healthy)".

## Service Access

### PostgreSQL
- **Host:** `localhost`
- **Port:** `5433`
- **User:** `${POSTGRES_USER}` (default: `dht_admin`)
- **Database:** `${POSTGRES_DB}` (default: `dht_hub`)

### Redis
- **Host:** `localhost`
- **Port:** `6380`
- **Password:** `${REDIS_PASSWORD}`

### Meilisearch
- **API URL:** `http://localhost:7700`
- **Health Check:** `http://localhost:7700/health`
- **Master Key:** `${MEILISEARCH_MASTER_KEY}`

### Minio
- **API URL:** `http://localhost:9000`
- **Console URL:** `http://localhost:9001`
- **Root User:** `${MINIO_ROOT_USER}` (default: `minioadmin`)
- **Root Password:** `${MINIO_ROOT_PASSWORD}`

## Common Commands

### Start Services

```bash
docker-compose -f dht-docker-compose.yml up -d
```

### Stop Services

```bash
docker-compose -f dht-docker-compose.yml down
```

### View Logs

```bash
# All services
docker-compose -f dht-docker-compose.yml logs -f

# Specific service
docker-compose -f dht-docker-compose.yml logs -f dht-postgres
docker-compose -f dht-docker-compose.yml logs -f dht-redis
docker-compose -f dht-docker-compose.yml logs -f dht-meilisearch
docker-compose -f dht-docker-compose.yml logs -f dht-minio
```

### Restart Services

```bash
docker-compose -f dht-docker-compose.yml restart
```

### Remove All Services and Volumes

**Warning:** This will delete all data!

```bash
docker-compose -f dht-docker-compose.yml down -v
```

## Volumes

Docker volumes persist data even when containers are stopped:

| Volume | Container Path | Description |
|--------|----------------|-------------|
| `dht-postgres-data` | `/var/lib/postgresql` | PostgreSQL data files |
| `dht-redis-data` | `/data` | Redis persistence files |
| `dht-meilisearch-data` | `/meili_data` | Meilisearch index files |
| `dht-minio-data` | `/data` | Minio object storage |

## Health Checks

All services include health checks:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' dht-postgres
docker inspect --format='{{.State.Health.Status}}' dht-redis
docker inspect --format='{{.State.Health.Status}}' dht-meilisearch
docker inspect --format='{{.State.Health.Status}}' dht-minio
```

## Troubleshooting

### Port Already in Use

If you get a port conflict, change the port in `.env`:

```env
POSTGRES_PORT=5434    # Change from 5433
REDIS_PORT=6381       # Change from 6380
MEILISEARCH_PORT=7701  # Change from 7700
MINIO_API_PORT=9001    # Change from 9000
MINIO_CONSOLE_PORT=9002 # Change from 9001
```

### Service Won't Start

Check the logs for errors:

```bash
docker-compose -f dht-docker-compose.yml logs <service-name>
```

### Reset All Data

**Warning:** This will delete all data!

```bash
docker-compose -f dht-docker-compose.yml down -v
docker-compose -f dht-docker-compose.yml up -d
```

### Database Connection Issues

Ensure `.env` has the correct `DATABASE_URL`:

```env
DATABASE_URL="postgresql://dht_admin:your_secure_password@localhost:5433/dht_hub?schema=public"
```

## Development Workflow

1. Start Docker services once: `docker-compose -f dht-docker-compose.yml up -d`
2. Run API with `pnpm dev:api`
3. Services will persist data across restarts
4. Stop services when done: `docker-compose -f dht-docker-compose.yml down`

## Production Considerations

- Change all default passwords
- Use strong, randomly generated secrets
- Enable SSL/TLS for production
- Configure firewall rules
- Set up automated backups
- Monitor resource usage
- Configure proper resource limits in docker-compose.yml
