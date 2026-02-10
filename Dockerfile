FROM node:24-alpine

WORKDIR /app

# Install dependencies (only production)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Create volume/directory for database
RUN mkdir -p /data
VOLUME /data

# Default environment variables
ENV NODE_ENV=production
ENV DB_PATH=/data/toot_history.db
ENV CRON_SCHEDULE="0 * * * *"

CMD ["node", "src/index.js"]
