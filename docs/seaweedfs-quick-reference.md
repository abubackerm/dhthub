# SeaweedFS Quick Reference Guide

## Validation and Deployment

### Step 1: Validate Configuration

```bash
# Make validation script executable
chmod +x scripts/validate-seaweedfs-config.sh

# Run validation
./scripts/validate-seaweedfs-config.sh
```

This will check:
- Docker and Docker Compose availability
- Required environment variables
- Docker network existence
- Docker volumes existence
- Docker Compose syntax
- Port availability
- Running services status

### Step 2: Start Services

```bash
# Start all SeaweedFS services
docker-compose -f dht-docker-compose.yml up -d

# Check service status
docker-compose -f dht-docker-compose.yml ps

# View logs
docker-compose -f dht-docker-compose.yml logs -f
```

### Step 3: Initialize PostgreSQL Schema

```bash
# Make initialization script executable
chmod +x scripts/init-seaweedfs.sh

# Run initialization
./scripts/init-seaweedfs.sh
```

This will:
- Create `seaweedfs` schema in PostgreSQL
- Grant necessary permissions
- Verify schema creation
- Check cluster health
- Create default S3 bucket (if AWS CLI or mc is available)

### Step 4: Verify Deployment

```bash
# Check master status
curl http://localhost:9333/cluster/status

# Check volume servers
curl http://localhost:8080/status
curl http://localhost:8081/status
curl http://localhost:8082/status

# Check filer health
curl http://localhost:8888/healthz

# Check S3 gateway health
curl http://localhost:8333/healthz
```

## Quick S3 Operations

### Using AWS CLI

```bash
# Configure AWS CLI
export AWS_ACCESS_KEY_ID=your_s3_access_key
export AWS_SECRET_ACCESS_KEY=your_s3_secret_key
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:8333

# Create bucket
aws s3 mb s3://test-bucket --endpoint-url=http://localhost:8333

# Upload file
echo "Hello SeaweedFS" > test.txt
aws s3 cp test.txt s3://test-bucket/ --endpoint-url=http://localhost:8333

# List buckets
aws s3 ls --endpoint-url=http://localhost:8333

# List objects
aws s3 ls s3://test-bucket --endpoint-url=http://localhost:8333

# Download file
aws s3 cp s3://test-bucket/test.txt downloaded.txt --endpoint-url=http://localhost:8333

# Delete file
aws s3 rm s3://test-bucket/test.txt --endpoint-url=http://localhost:8333

# Delete bucket
aws s3 rb s3://test-bucket --endpoint-url=http://localhost:8333
```

### Using MinIO Client (mc)

```bash
# Configure mc
mc alias set local http://localhost:8333 your_s3_access_key your_s3_secret_key

# Create bucket
mc mb local/test-bucket

# Upload file
mc cp test.txt local/test-bucket/

# List buckets
mc ls local

# List objects
mc ls local/test-bucket

# Download file
mc cp local/test-bucket/test.txt downloaded.txt

# Delete file
mc rm local/test-bucket/test.txt

# Delete bucket
mc rb local/test-bucket
```

## Service URLs

| Service | URL | Description |
|----------|-----|-------------|
| Master API | http://localhost:9333 | Cluster management |
| Master Metrics | http://localhost:9324/metrics | Prometheus metrics |
| Volume 1 | http://localhost:8080 | Storage server 1 |
| Volume 1 Metrics | http://localhost:9325/metrics | Prometheus metrics |
| Volume 2 | http://localhost:8081 | Storage server 2 |
| Volume 2 Metrics | http://localhost:9326/metrics | Prometheus metrics |
| Volume 3 | http://localhost:8082 | Storage server 3 |
| Volume 3 Metrics | http://localhost:9327/metrics | Prometheus metrics |
| Filer API | http://localhost:8888 | File operations |
| Filer Metrics | http://localhost:9328/metrics | Prometheus metrics |
| S3 API | http://localhost:8333 | S3-compatible API |
| S3 Metrics | http://localhost:9329/metrics | Prometheus metrics |

## PostgreSQL Schema Queries

```bash
# Connect to PostgreSQL
docker exec -it dht-postgres psql -U dht_admin -d dht_hub

# List all tables in seaweedfs schema
\dt seaweedfs.*

# Count files
SELECT COUNT(*) FROM seaweedfs.filemeta;

# View recent files
SELECT * FROM seaweedfs.filemeta ORDER BY created_at DESC LIMIT 10;

# View directory structure
SELECT * FROM seaweedfs.directory;

# Check schema size
SELECT 
  pg_size_pretty(pg_total_relation_size('seaweedfs.filemeta')) as filemeta_size,
  pg_size_pretty(pg_total_relation_size('seaweedfs.directory')) as directory_size;

# Exit PostgreSQL
\q
```

## Common Commands

### Container Management

```bash
# Start services
docker-compose -f dht-docker-compose.yml up -d

# Stop services
docker-compose -f dht-docker-compose.yml down

# Restart services
docker-compose -f dht-docker-compose.yml restart

# View logs for all services
docker-compose -f dht-docker-compose.yml logs -f

# View logs for specific service
docker-compose -f dht-docker-compose.yml logs -f dht-seaweedfs-s3

# View container status
docker ps | grep seaweedfs

# Exec into a container
docker exec -it dht-seaweedfs-s3 /bin/sh
```

### Volume Management

```bash
# List all volumes
docker volume ls | grep seaweedfs

# Inspect volume
docker volume inspect dht-seaweedfs-volume-1-data

# Remove volume (WARNING: This deletes all data!)
docker volume rm dht-seaweedfs-volume-1-data
```

### Network Management

```bash
# List networks
docker network ls

# Inspect network
docker network inspect dht-hub-network

# View connected containers
docker network inspect dht-hub-network --format '{{.Containers}}'
```

## Troubleshooting

### Services Not Starting

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check if network exists
docker network ls | grep dht-hub-network

# Check environment variables
cat .env | grep SEAWEDFS

# Validate docker-compose.yml
docker-compose -f dht-docker-compose.yml config
```

### S3 API Not Working

```bash
# Check S3 gateway is running
curl http://localhost:8333/healthz

# Check logs
docker-compose -f dht-docker-compose.yml logs dht-seaweedfs-s3

# Test with AWS CLI
aws s3 ls --endpoint-url=http://localhost:8333 --debug
```

### PostgreSQL Schema Issues

```bash
# Check if schema exists
docker exec -it dht-postgres psql -U dht_admin -d dht_hub -c "\dn seaweedfs"

# Re-create schema
docker exec -it dht-postgres psql -U dht_admin -d dht_hub -c "DROP SCHEMA IF EXISTS seaweedfs CASCADE;"
docker exec -it dht-postgres psql -U dht_admin -d dht_hub -c "CREATE SCHEMA seaweedfs;"

# Re-run initialization
./scripts/init-seaweedfs.sh
```

### Volume Servers Not Healthy

```bash
# Check volume server status
curl http://localhost:8080/status
curl http://localhost:8081/status
curl http://localhost:8082/status

# Check master volume status
curl http://localhost:9333/vol/status

# Restart volume servers
docker-compose -f dht-docker-compose.yml restart dht-seaweedfs-volume-1
docker-compose -f dht-docker-compose.yml restart dht-seaweedfs-volume-2
docker-compose -f dht-docker-compose.yml restart dht-seaweedfs-volume-3
```

## Performance Testing

### Upload Test

```bash
# Create test file (100MB)
dd if=/dev/zero of=testfile.bin bs=1M count=100

# Upload and time it
time aws s3 cp testfile.bin s3://test-bucket/ --endpoint-url=http://localhost:8333

# Delete test file
rm testfile.bin
```

### Download Test

```bash
# Download and time it
time aws s3 cp s3://test-bucket/testfile.bin downloaded.bin --endpoint-url=http://localhost:8333

# Cleanup
rm downloaded.bin
```

## Backup and Restore

### Backup PostgreSQL Schema

```bash
# Backup seaweedfs schema only
docker exec dht-postgres pg_dump -U dht_admin -d dht_hub -n seaweedfs > seaweedfs-backup.sql

# Backup all databases
docker exec dht-postgres pg_dumpall -U dht_admin > full-backup.sql
```

### Restore PostgreSQL Schema

```bash
# Restore seaweedfs schema
docker exec -i dht-postgres psql -U dht_admin -d dht_hub < seaweedfs-backup.sql

# Restore all databases
docker exec -i dht-postgres psql -U dht_admin < full-backup.sql
```

### Backup Docker Volumes

```bash
# Backup volume data
docker run --rm -v dht-seaweedfs-volume-1-data:/data -v $(pwd):/backup ubuntu tar czf /backup/volume-1-backup.tar.gz /data

# Restore volume data
docker run --rm -v dht-seaweedfs-volume-1-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/volume-1-backup.tar.gz -C /
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| SEAWEDFS_S3_ACCESS_KEY | - | S3 access key |
| SEAWEDFS_S3_SECRET_KEY | - | S3 secret key |
| SEAWEDFS_S3_PORT | 8333 | S3 API port |
| SEAWEDFS_FILER_PORT | 8888 | Filer API port |
| SEAWEDFS_MASTER_PORT | 9333 | Master API port |
| SEAWEDFS_VOLUME_PORT_START | 8080 | Starting port for volume servers |
| SEAWEDFS_PG_SCHEMA | seaweedfs | PostgreSQL schema name |
| SEAWEDFS_PG_HOST | dht-postgres | PostgreSQL host |
| SEAWEDFS_PG_PORT | 5432 | PostgreSQL port |
| SEAWEDFS_PG_USER | dht_admin | PostgreSQL user |
| SEAWEDFS_PG_PASSWORD | - | PostgreSQL password |
| SEAWEDFS_PG_DB | dht_hub | PostgreSQL database |

## Next Steps

1. **Configure Application**: Update your NestJS application to use SeaweedFS S3 endpoint
2. **Set Up Monitoring**: Configure Prometheus to collect metrics from SeaweedFS services
3. **Configure Backups**: Set up automated backups for PostgreSQL schema and Docker volumes
4. **Performance Tuning**: Adjust configuration based on your workload
5. **High Availability**: Consider adding more volume servers for production deployments

## Additional Documentation

- [SeaweedFS Setup Guide](seaweedfs-setup.md) - Comprehensive setup and usage guide
- [SeaweedFS Official Docs](https://github.com/seaweedfs/seaweedfs) - Official documentation
- [AWS S3 SDK](https://aws.amazon.com/sdk-for-javascript/) - JavaScript/TypeScript SDK
