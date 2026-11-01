FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/

RUN npm ci --omit=dev

COPY packages/backend ./packages/backend

# Documentacion: avisa que la app escucha en el 8000. No abre ni publica
# nada; eso lo hace "ports" en el compose.
EXPOSE 8000

CMD ["npm", "run", "start:backend"]