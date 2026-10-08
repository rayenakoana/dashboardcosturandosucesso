#!/bin/sh
set -e

# Substitui apenas SUPABASE_FUNCTIONS_URL no template Nginx.
# As variáveis internas do Nginx ($uri, $host, $proxy_host, etc.) são
# preservadas porque não constam na lista passada ao envsubst.
# Segredos de API (Anthropic, n8n) residem nos Supabase secrets — nunca no
# container Docker.
envsubst '${SUPABASE_FUNCTIONS_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
