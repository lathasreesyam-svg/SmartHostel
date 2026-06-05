# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Railway passes env vars as Docker build args automatically
# VITE_ vars must be available at build time to be baked into the bundle
ARG VITE_API_URL=https://smarthostel-production-b4ce.up.railway.app/api/v1
ARG VITE_SOCKET_URL=https://smarthostel-production-b4ce.up.railway.app
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Serve stage — simple Nginx for SPA
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Simple static SPA config — no proxy needed since VITE_API_URL points directly to backend
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
