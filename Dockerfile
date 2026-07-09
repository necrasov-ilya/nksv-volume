FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.client.json ./
COPY server.ts ./
COPY src ./src
COPY public ./public

COPY editor-app/package.json editor-app/package-lock.json* ./editor-app/
RUN npm --prefix editor-app ci
COPY editor-app ./editor-app
RUN npm run build:client && npm --prefix editor-app run build && npm prune --omit=dev && npm cache clean --force

RUN mkdir -p /app/data /app/uploads && chown -R node:node /app

USER node

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
