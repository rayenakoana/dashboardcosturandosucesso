#!/bin/sh
set -e

# Substitui apenas as variáveis de segredo conhecidas no template Nginx.
# As variáveis internas do Nginx ($uri, $host, $proxy_host, etc.) são
# preservadas porque não constam na lista passada ao envsubst.
envsubst '${ANTHROPIC_KEY} ${N8N_ADMIN_SECRET} ${N8N_ADMIN_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
