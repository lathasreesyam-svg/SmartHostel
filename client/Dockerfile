# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# VITE_API_URL is injected by Railway at build time via env var
# Default to relative path so Nginx proxy works as fallback
ARG VITE_API_URL=/api/v1
ARG VITE_SOCKET_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# nginx.conf is injected at runtime via entrypoint
# We use a template so BACKEND_URL env var can be substituted
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
