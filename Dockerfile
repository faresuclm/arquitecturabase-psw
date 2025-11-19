# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port 8080 (Cloud Run uses this by default)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]

