FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (use ci for reproducible builds)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 5000

# Start script
CMD ["npm", "run", "dev"]
