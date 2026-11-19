FROM node:24-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only (no TypeScript tooling)
RUN npm install --omit=dev --no-audit --no-fund

# Copy application source
COPY . .

# Next.js standalone build is not used in dev; we run `next dev` via docker-compose override.
# For production `docker-compose up`, build the app:
RUN npm run build 2>/dev/null || true

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]