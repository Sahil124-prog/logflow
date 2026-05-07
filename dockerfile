# Stage 1 — Builder
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2 — Runner
FROM node:18-alpine

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

EXPOSE 5000
USER node
CMD ["node", "src/index.js"]