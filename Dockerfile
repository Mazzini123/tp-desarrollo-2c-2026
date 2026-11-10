FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/

RUN npm ci --omit=dev

COPY packages/backend ./packages/backend

EXPOSE 8000

CMD ["npm", "run", "start:backend"]