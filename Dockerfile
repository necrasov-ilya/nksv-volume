FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.ts ./
COPY src ./src
COPY public ./public

RUN mkdir -p /app/data /app/uploads && chown -R node:node /app

USER node

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
