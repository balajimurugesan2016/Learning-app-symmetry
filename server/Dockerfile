# Server Dockerfile
FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ py3-setuptools

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild native modules
RUN npm ci --only=production && \
    npm rebuild sqlite3 --build-from-source

# Copy application files
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
