FROM node:20-alpine

WORKDIR /app

# Copy shared prisma schema from core server (root context: .)
COPY server/prisma ./prisma/

COPY services/attendance-service/package*.json ./
RUN npm install

# Generate Prisma client using the shared schema
RUN npx prisma generate

COPY services/attendance-service/tsconfig.json ./
COPY services/attendance-service/src/ ./src/
RUN npm run build

EXPOSE 5002
CMD ["node", "dist/index.js"]
