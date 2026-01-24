# Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose port (Railway will set PORT env var dynamically)
EXPOSE 3000

# Note: Railway handles health checks via railway.toml
# No need for Docker HEALTHCHECK as Railway uses its own healthcheckPath

# Start application
CMD ["npm", "start"]
