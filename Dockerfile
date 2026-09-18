FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
ARG ANTHROPIC_KEY
RUN echo "server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location /api/claude { \
        proxy_pass https://api.anthropic.com/v1/messages; \
        proxy_ssl_server_name on; \
        proxy_set_header Host api.anthropic.com; \
        proxy_set_header x-api-key \"${ANTHROPIC_KEY}\"; \
        proxy_set_header anthropic-version \"2023-06-01\"; \
        proxy_set_header Content-Type \"application/json\"; \
        add_header Access-Control-Allow-Origin *; \
        add_header Access-Control-Allow-Methods \"POST, OPTIONS\"; \
        add_header Access-Control-Allow-Headers \"Content-Type\"; \
        if (\$request_method = OPTIONS) { return 204; } \
    } \
    location / { try_files \$uri \$uri/ /index.html; } \
}" > /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
