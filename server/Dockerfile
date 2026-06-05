FROM node:20-alpine

# Install OpenSSL (required by Prisma on Alpine)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production=false

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source and build TypeScript
COPY . .
RUN npm run build

# Remove dev deps after build to reduce image size
RUN npm prune --production

# Make entrypoint executable
RUN chmod +x entrypoint.sh

EXPOSE 5000

CMD ["sh", "entrypoint.sh"]
