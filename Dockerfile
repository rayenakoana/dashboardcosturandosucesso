FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# Segredos NÃO são mais build args — são injetados em runtime.
# Passe-os na execução do container:
#   docker run -e ANTHROPIC_KEY=... -e N8N_ADMIN_SECRET=... -e N8N_ADMIN_URL=... <imagem>
# ou via Docker Compose (environment: / env_file:) ou secrets do orquestrador.
COPY nginx/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["/docker-entrypoint.sh"]
