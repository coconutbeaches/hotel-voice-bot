# syntax=docker/dockerfile:1
FROM node:18-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Verify ffmpeg availability (fail if not present)
RUN ffmpeg -version

# Default command
CMD ["npm", "start"]

