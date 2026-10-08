#!/bin/bash
# =============================================================================
# CS DASH — Script de Diagnóstico VPS (somente leitura) — v2
# Branch: integration/csdash-funil-premium  Commit: 80dc9f9
# Gerado em: 2026-10-08
#
# INSTRUÇÕES:
#   Execute este script na VPS como usuário ubuntu (sem sudo desnecessário).
#   O script NÃO faz alterações. NÃO imprime valores de credenciais.
#   Salve a saída completa e envie para análise.
#
#   chmod +x vps_diagnostico_readonly_v2.sh
#   ./vps_diagnostico_readonly_v2.sh 2>&1 | tee diagnostico_$(date +%Y%m%d_%H%M).txt
# =============================================================================

# [C1] set -e removido: substituído por verificações explícitas com mensagens claras.
# set -u mantido para detectar variáveis não definidas.
# set -o pipefail mantido para detectar erros em pipes.
set -uo pipefail

SEP="────────────────────────────────────────────────────────────"

header() { echo; echo "$SEP"; echo "§ $1"; echo "$SEP"; }

# ── 1. IDENTIFICAÇÃO DO HOST ─────────────────────────────────────────────────
header "1. HOST E DATA"
echo "Data/hora:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Hostname:    $(hostname)"
echo "Usuário:     $(whoami)"
echo "Kernel:      $(uname -r)"
echo "Uptime:      $(uptime -p 2>/dev/null || uptime)"

# ── 2. CONTAINERS EM EXECUÇÃO ────────────────────────────────────────────────
header "2. CONTAINERS EM EXECUÇÃO"
if ! docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null; then
  echo "[ERRO] docker ps falhou — verificar se o usuário pertence ao grupo docker"
fi

header "2b. TODOS OS CONTAINERS (incluindo parados)"
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.CreatedAt}}' 2>/dev/null \
  || echo "[ERRO] docker ps -a falhou"

# ── 3. SERVIÇO CSDASH ────────────────────────────────────────────────────────
header "3. INSPEÇÃO DO SERVIÇO csdash"

echo "--- Imagem atual (nome e tag) ---"
docker inspect csdash --format '{{.Config.Image}}' 2>/dev/null \
  || echo "[AVISO] Container csdash não encontrado"

echo ""
echo "--- Nomes das variáveis de ambiente (SEM valores) ---"
# [C4] cut -d= -f1 garante que somente o nome da variável seja impresso, nunca o valor
docker inspect csdash --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
  | cut -d= -f1 \
  | sort \
  || echo "[AVISO] Não foi possível inspecionar variáveis"

echo ""
echo "--- Portas mapeadas ---"
docker inspect csdash --format '{{range $k,$v := .NetworkSettings.Ports}}{{$k}} -> {{$v}}{{println}}{{end}}' 2>/dev/null \
  || echo "[AVISO] Não foi possível inspecionar portas"

echo ""
echo "--- Redes ---"
docker inspect csdash --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{println}}{{end}}' 2>/dev/null \
  || echo "[AVISO] Não foi possível inspecionar redes"

echo ""
echo "--- Mounts/volumes ---"
docker inspect csdash --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{println}}{{end}}' 2>/dev/null \
  || echo "[AVISO] Não foi possível inspecionar mounts"

echo ""
echo "--- Restart policy ---"
docker inspect csdash --format '{{.HostConfig.RestartPolicy.Name}}' 2>/dev/null \
  || echo "[AVISO] Não foi possível inspecionar restart policy"

echo ""
echo "--- Data de criação ---"
docker inspect csdash --format '{{.Created}}' 2>/dev/null \
  || echo "[AVISO] Não foi possível obter data de criação"

# [C1] Seção de histórico de imagem REMOVIDA.
# docker history --no-trunc pode expor valores de build args (VITE_SUPABASE_URL,
# VITE_SUPABASE_PUBLISHABLE_KEY). Substituída por metadados seguros abaixo.
echo ""
echo "--- Labels da imagem (metadados seguros, sem build args) ---"
CURRENT_IMG=$(docker inspect csdash --format '{{.Config.Image}}' 2>/dev/null || true)
if [ -n "${CURRENT_IMG:-}" ]; then
  docker inspect "$CURRENT_IMG" \
    --format '{{range $k,$v := .Config.Labels}}{{$k}}={{$v}}{{println}}{{end}}' 2>/dev/null \
    || echo "(sem labels ou imagem não disponível localmente)"
else
  echo "[AVISO] Imagem do csdash não encontrada"
fi

# ── 4. DOCKER COMPOSE ────────────────────────────────────────────────────────
header "4. DOCKER COMPOSE — estrutura (SEM valores de credenciais)"
COMPOSE_FILE="/home/ubuntu/automacao/docker-compose.yml"

if [ -f "$COMPOSE_FILE" ]; then
  echo "Arquivo encontrado: $COMPOSE_FILE"

  echo ""
  echo "--- Serviços definidos (linhas de nível raiz de serviço) ---"
  # [C5] grep simples em vez de sed encadeado; || true evita interrupção em arquivo inesperado
  grep -E "^  [a-z_-]+:" "$COMPOSE_FILE" | tr -d ' :' | sort || true

  echo ""
  echo "--- Nomes das variáveis de ambiente declaradas (SEM valores) ---"
  # [C4] grep busca linhas do tipo "- NOME_VAR" ou "- NOME_VAR=" e extrai somente o nome
  grep -E "^\s*-\s+[A-Z_][A-Z0-9_]*[=]?" "$COMPOSE_FILE" \
    | sed 's/.*-\s*//' \
    | cut -d= -f1 \
    | tr -d ' ' \
    | sort -u \
    || echo "(nenhuma variável no formato esperado encontrada)"

  echo ""
  echo "--- Imagem declarada para csdash ---"
  # [C5] awk com flag de estado mais robusto; || true evita interrupção
  awk '/^  csdash:/{found=1} found && /^\s+image:/{print; found=0}' "$COMPOSE_FILE" \
    || echo "(imagem não encontrada no bloco csdash)"

  echo ""
  echo "--- Dependências (depends_on) para csdash ---"
  # [C5] grep + awk com || true; limita a 10 linhas para evitar saída excessiva
  awk '/^  csdash:/{found=1} found && /^  [a-z]/ && !/^  csdash:/{found=0} found && /depends_on/{in_dep=1} in_dep && /^      -/{print $2} in_dep && /^    [a-z]/ && !/depends_on/{in_dep=0}' \
    "$COMPOSE_FILE" 2>/dev/null | head -10 \
    || echo "(sem depends_on ou não encontrado)"

  echo ""
  echo "--- Portas mapeadas para csdash ---"
  # [C5] awk mais preciso para extrair somente o bloco ports do serviço csdash
  awk '/^  csdash:/{found=1} found && /^  [a-z]/ && !/^  csdash:/{found=0} found && /ports:/{in_ports=1; next} in_ports && /^\s+-/{print $0} in_ports && /^\s+[a-z]/ && !/^\s+-/{in_ports=0}' \
    "$COMPOSE_FILE" 2>/dev/null | head -10 \
    || echo "(sem ports ou não encontrado)"

else
  echo "[AVISO] Arquivo não encontrado: $COMPOSE_FILE"
  echo "Procurando outros arquivos compose em /home/ubuntu..."
  find /home/ubuntu -maxdepth 4 \( -name "docker-compose*.yml" -o -name "compose*.yml" \) 2>/dev/null \
    | head -10 \
    || echo "(nenhum arquivo compose encontrado)"
fi

# ── 5. CÓDIGO LOCAL — ESTADO DO GIT ──────────────────────────────────────────
header "5. CÓDIGO LOCAL — /opt/dashboardcosturandosucesso"
CODE_DIR="/opt/dashboardcosturandosucesso"

if [ -d "$CODE_DIR/.git" ]; then
  echo "Branch atual:"
  git -C "$CODE_DIR" branch --show-current 2>/dev/null || echo "(não disponível)"

  echo ""
  echo "HEAD:"
  git -C "$CODE_DIR" rev-parse HEAD 2>/dev/null || echo "(não disponível)"

  echo ""
  echo "Log recente (hash curto + mensagem):"
  git -C "$CODE_DIR" log --oneline -5 2>/dev/null || echo "(não disponível)"

  echo ""
  echo "Status (arquivos modificados/não rastreados):"
  git -C "$CODE_DIR" status --short 2>/dev/null || echo "(não disponível)"

  echo ""
  echo "Branches remotas disponíveis:"
  git -C "$CODE_DIR" branch -r 2>/dev/null | head -15 || echo "(não disponível)"

  # [C3] Remote URL NÃO é exibida — pode conter token ou credencial embutida.
  echo ""
  echo "Remote origin: [URL OMITIDA — pode conter credenciais embutidas]"
  # Confirma apenas se o remote existe:
  if git -C "$CODE_DIR" remote get-url origin >/dev/null 2>&1; then
    echo "Remote 'origin' existe: sim"
  else
    echo "Remote 'origin' existe: não"
  fi
else
  echo "[AVISO] Diretório não encontrado ou não é um repositório git: $CODE_DIR"
  echo "Conteúdo de /opt/:"
  ls -la /opt/ 2>/dev/null | head -20 || echo "(ls /opt/ falhou)"
fi

# ── 6. ESPAÇO EM DISCO ───────────────────────────────────────────────────────
header "6. ESPAÇO EM DISCO"
echo "--- Geral ---"
df -h --output=source,fstype,size,used,avail,pcent,target 2>/dev/null \
  | grep -v tmpfs | grep -v udev | head -10 \
  || df -h 2>/dev/null | head -10 \
  || echo "[AVISO] df falhou"

echo ""
echo "--- Docker disk usage ---"
docker system df 2>/dev/null || echo "[AVISO] docker system df falhou"

echo ""
echo "--- Imagens disponíveis (sem digest) ---"
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}' 2>/dev/null \
  | head -20 \
  || echo "[AVISO] docker images falhou"

# ── 7. REDE E PROXY REVERSO ──────────────────────────────────────────────────
header "7. REDE — PORTAS ABERTAS E PROXY"
echo "--- Portas em escuta (tcp) ---"
ss -tlnp 2>/dev/null | grep "LISTEN" | awk '{print $4, $6}' | sort \
  || netstat -tlnp 2>/dev/null | grep LISTEN | head -20 \
  || echo "[AVISO] ss/netstat não disponíveis ou sem permissão"

echo ""
echo "--- Redes Docker ---"
docker network ls 2>/dev/null || echo "[AVISO] docker network ls falhou"

echo ""
echo "--- Redes do container csdash ---"
docker inspect csdash \
  --format '{{range $k,$v := .NetworkSettings.Networks}}Rede: {{$k}}{{println}}{{end}}' \
  2>/dev/null || echo "[AVISO] csdash não encontrado"

# ── 8. OUTROS SERVIÇOS ───────────────────────────────────────────────────────
header "8. ESTADO DOS DEMAIS SERVIÇOS"
for SVC in n8n evolution redis postgres nginx traefik; do
  STATUS=$(docker inspect "$SVC" --format '{{.State.Status}}' 2>/dev/null || echo "não encontrado")
  IMAGE=$(docker inspect "$SVC" --format '{{.Config.Image}}' 2>/dev/null || echo "—")
  echo "  $SVC: $STATUS | imagem: $IMAGE"
done

# [C2] Seção de logs REMOVIDA.
# docker logs pode expor dados sensíveis (URLs, paths internos, tokens em query strings).
# Para inspecionar logs em caso de incidente, executar manualmente:
#   docker logs csdash --tail 30 2>&1 | grep -v -i "token\|secret\|key\|password\|auth"
echo ""
echo "§ NOTA: logs do container foram omitidos neste script (podem conter dados sensíveis)."
echo "  Para inspecionar manualmente, execute com filtros adequados."

# ── 9. SUMÁRIO FINAL ────────────────────────────────────────────────────────
header "9. SUMÁRIO"
echo "Containers ativos:  $(docker ps -q 2>/dev/null | wc -l || echo 'N/D')"
echo "Imagens locais:     $(docker images -q 2>/dev/null | wc -l || echo 'N/D')"
echo "Espaço livre /:     $(df -h / 2>/dev/null | awk 'NR==2{print $4}' || echo 'N/D')"
echo "Espaço livre /var:  $(df -h /var 2>/dev/null | awk 'NR==2{print $4}' || echo 'N/D')"
CURRENT_IMG2=$(docker inspect csdash --format '{{.Config.Image}}' 2>/dev/null || echo "não encontrado")
echo "Imagem csdash atual: ${CURRENT_IMG2}"
echo ""
echo "Script concluído em: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "$SEP"
