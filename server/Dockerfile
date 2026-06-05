FROM node:20-alpine

# Install OpenSSL (required by Prisma on Alpine)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Make entrypoint executable
RUN chmod +x entrypoint.sh

EXPOSE 5000

# Use entrypoint to migrate, seed, then start
CMD ["sh", "entrypoint.sh"]
