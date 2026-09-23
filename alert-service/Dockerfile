FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/index.js ./index.js
COPY --from=builder /app/publisher.js ./publisher.js
COPY --from=builder /app/models ./models
COPY --from=builder /app/package.json ./package.json
USER node
CMD ["node", "index.js"]

