# Production Deployment Guide

This guide covers deploying RadioCalico with PostgreSQL database and nginx web server in production.

## Architecture

The production deployment consists of three services:
- **nginx**: Frontend web server (port 80)
- **backend**: Node.js/Express API server (port 3001, internal)
- **postgres**: PostgreSQL database (port 5432, internal)

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured (optional)
- SSL certificate (optional, for HTTPS)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd radiocalico
   ```

2. **Set up environment variables**
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your secure passwords
   ```

3. **Build and start the services**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify deployment**
   ```bash
   # Check service status
   docker-compose -f docker-compose.prod.yml ps

   # View logs
   docker-compose -f docker-compose.prod.yml logs -f

   # Test the application
   curl http://localhost/
   curl http://localhost/api/
   ```

## Service Details

### PostgreSQL Database
- Image: postgres:15-alpine
- Persistent storage via Docker volume
- Automatic initialization with `init.sql`
- Health checks configured
- Default credentials (change in production):
  - Database: radiocalico
  - User: radiocalico
  - Password: Set via DB_PASSWORD env variable

### Backend API
- Custom Node.js application
- Connects to PostgreSQL in production mode
- Falls back to SQLite for development
- Environment-based configuration
- Non-root user for security
- Read-only filesystem with tmpfs for temporary files

### Nginx Frontend
- Serves static files from `/public`
- Proxies API requests to backend
- Gzip compression enabled
- Security headers configured
- Cache control for static assets
- Health check endpoint at `/health`

## Commands

### Start services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Stop services
```bash
docker-compose -f docker-compose.prod.yml down
```

### View logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Update and rebuild
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Database backup
```bash
docker exec radiocalico-postgres pg_dump -U radiocalico radiocalico > backup.sql
```

### Database restore
```bash
docker exec -i radiocalico-postgres psql -U radiocalico radiocalico < backup.sql
```

## Security Considerations

1. **Change default passwords**: Update DB_PASSWORD in `.env.production`
2. **Use HTTPS**: Configure SSL certificates with nginx
3. **Firewall**: Only expose port 80/443, keep database internal
4. **Updates**: Regularly update Docker images and dependencies
5. **Monitoring**: Set up logging and monitoring for production

## Troubleshooting

### Backend can't connect to database
- Check PostgreSQL is healthy: `docker-compose -f docker-compose.prod.yml ps`
- Verify environment variables in backend service
- Check PostgreSQL logs: `docker-compose -f docker-compose.prod.yml logs postgres`

### Nginx returns 502 Bad Gateway
- Ensure backend service is running
- Check backend health: `docker exec radiocalico-backend wget -O- http://localhost:3001/`
- Review nginx logs: `docker-compose -f docker-compose.prod.yml logs nginx`

### Database initialization fails
- Check `init.sql` syntax
- Ensure PostgreSQL volume is not corrupted
- Remove volume and reinitialize: `docker volume rm radiocalico_postgres_data`

## Performance Tuning

### PostgreSQL
- Adjust shared_buffers and work_mem based on available RAM
- Configure connection pooling in backend application
- Add appropriate indexes for query optimization

### Nginx
- Tune worker_processes and worker_connections
- Configure caching for static assets
- Enable HTTP/2 for better performance

### Node.js Backend
- Use PM2 or similar for process management in production
- Configure Node.js memory limits
- Enable clustering for multi-core systems

## Monitoring

Consider adding:
- Prometheus + Grafana for metrics
- ELK stack for log aggregation
- Health check monitoring service
- Database query performance monitoring