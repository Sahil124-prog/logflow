# Stage 1 — Builder
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
# .dockerignore excludes node_modules, .env, .git, *.log
# so secrets and unnecessary files never enter the image
COPY . .

# Stage 2 — Runner
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 CMD wget -qO- http://localhost:5000/health || exit 1 
EXPOSE 5000
USER node
CMD ["node", "src/index.js"]