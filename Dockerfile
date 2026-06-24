FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.client.json ./
COPY server.ts ./
COPY src ./src
COPY public ./public

RUN npm run build:client && npm prune --omit=dev && npm cache clean --force

RUN mkdir -p /app/data /app/uploads && chown -R node:node /app

USER node

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
