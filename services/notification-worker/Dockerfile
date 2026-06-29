FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production || npm install --only=production

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm install typescript ts-node-dev --save-dev
RUN npx tsc

# Use compiled output
CMD ["node", "dist/index.js"]
