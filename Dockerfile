FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são variáveis públicas (anon key).
# Devem ser passadas em build time porque o Vite as embute no bundle durante npm run build.
# NÃO são segredos: o anon key é exposto ao browser por design do Supabase.
# Exemplo: docker build --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
#                       --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm run build

FROM nginx:alpine
# Segredos NÃO são build args — são injetados em runtime.
# Passe-os na execução do container:
#   docker run -e SUPABASE_FUNCTIONS_URL=https://xxx.supabase.co/functions/v1 <imagem>
# ou via Docker Compose (environment: / env_file:) ou secrets do orquestrador.
COPY nginx/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["/docker-entrypoint.sh"]
