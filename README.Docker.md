# Docker Deployment Guide

This guide explains how to run the Learning Tracker application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)

## Quick Start

1. **Clone the repository** (if not already done)

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your actual values for:
   - JWT_SECRET
   - Email SMTP settings
   - WhatsApp API credentials

3. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:3000

## Docker Commands

### Build and Start
```bash
# Build and start all services
docker-compose up -d

# Build without cache
docker-compose build --no-cache

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f server
docker-compose logs -f client
```

### Stop and Remove
```bash
# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove containers and volumes (WARNING: deletes database)
docker-compose down -v
```

### Rebuild After Changes
```bash
# Rebuild and restart
docker-compose up -d --build
```

## Individual Container Commands

### Build Server Only
```bash
cd server
docker build -t learning-tracker-server .
docker run -p 3000:3000 --env-file ../.env learning-tracker-server
```

### Build Client Only
```bash
cd client
docker build -t learning-tracker-client .
docker run -p 80:80 learning-tracker-client
```

## Data Persistence

The SQLite database is stored in a Docker volume named `server-data`. This ensures your data persists even when containers are recreated.

To backup the database:
```bash
docker cp learning-tracker-server:/app/data/learning_tracker.db ./backup.db
```

To restore the database:
```bash
docker cp ./backup.db learning-tracker-server:/app/data/learning_tracker.db
docker-compose restart server
```

## Production Deployment

For production deployment:

1. **Update environment variables** with secure values
2. **Use a reverse proxy** (nginx/Traefik) with SSL certificates
3. **Set up proper logging** and monitoring
4. **Configure backups** for the database volume
5. **Update the client API URL** if deploying to a different domain

## Troubleshooting

### Check container status
```bash
docker-compose ps
```

### View container logs
```bash
docker-compose logs -f
```

### Access container shell
```bash
docker exec -it learning-tracker-server sh
docker exec -it learning-tracker-client sh
```

### Restart a specific service
```bash
docker-compose restart server
docker-compose restart client
```

## Architecture

- **Server**: Node.js Express API running on port 3000
- **Client**: React app built with Vite, served by nginx on port 80
- **Database**: SQLite stored in a Docker volume
- **Network**: Both containers communicate via a bridge network

## Environment Variables

See `.env.example` for all available configuration options.
