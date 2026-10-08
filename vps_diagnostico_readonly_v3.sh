#!/bin/bash
# =============================================================================
# CS DASH — Script de Diagnóstico VPS (somente leitura) — v3
# Branch: integration/csdash-funil-premium  Commit: 80dc9f9
# Gerado em: 2026-10-08
#
# INSTRUÇÕES:
#   Execute este script na VPS como usuário ubuntu (sem sudo desnecessário).
#   O script NÃO faz alterações. NÃO imprime valores de credenciais.
#   Salve a saída completa e envie para análise.
#
#   chmod +x vps_diagnostico_readonly_v3.sh
#   ./vps_diagnostico_readonly_v3.sh 2>&1 | tee diagnostico_$(date +%Y%m%d_%H%M).txt
# =============================================================================

# [C1/C7] set -e removido: substituído por verificações explícitas com mensagens claras.
# set -u detecta variáveis não definidas. set -o pipefail detecta erros em pipes.
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
# cut -d= -f1 garante que somente o nome seja impresso, nunca o valor
docker inspect csdash --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
  | cut -d= -f1 \
  | sort \
  || echo "[AVISO] Não foi possível inspecionar variáveis"

echo ""
echo "--- Portas mapeadas (host:container) ---"
# Formato fixo via Go template — imprime apenas HostPort e ContainerPort, sem campos livres
docker inspect csdash \
  --format '{{range $port, $bindings := .NetworkSettings.Ports}}{{range $bindings}}{{.HostPort}} -> {{$port}}{{println}}{{end}}{{end}}' \
  2>/dev/null \
  || echo "[AVISO] Não foi possível inspecionar portas"

echo ""
echo "--- Redes ---"
docker inspect csdash \
  --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{println}}{{end}}' \
  2>/dev/null \
  || echo "[AVISO] Não foi possível inspecionar redes"

echo ""
echo "--- Mounts/volumes (tipo, origem, destino) ---"
docker inspect csdash \
  --format '{{range .Mounts}}{{.Type}} | {{.Source}} | {{.Destination}}{{println}}{{end}}' \
  2>/dev/null \
  || echo "[AVISO] Não foi possível inspecionar mounts"

echo ""
echo "--- Restart policy ---"
docker inspect csdash --format '{{.HostConfig.RestartPolicy.Name}}' 2>/dev/null \
  || echo "[AVISO] Não foi possível inspecionar restart policy"

echo ""
echo "--- Data de criação ---"
docker inspect csdash --format '{{.Created}}' 2>/dev/null \
  || echo "[AVISO] Não foi possível obter data de criação"

# [C3] docker history --no-trunc REMOVIDO (expõe build args).
# [C3] Labels da imagem REMOVIDAS: campo livre que pode conter informação arbitrária.
# Apenas os metadados estruturados acima são seguros e necessários.

# ── 4. DOCKER COMPOSE ────────────────────────────────────────────────────────
header "4. DOCKER COMPOSE — metadados estruturados (SEM valores de credenciais)"
COMPOSE_FILE="/home/ubuntu/automacao/docker-compose.yml"

if [ -f "$COMPOSE_FILE" ]; then
  echo "Arquivo encontrado: $COMPOSE_FILE"

  echo ""
  echo "--- Serviços definidos ---"
  # Extrai somente nomes de serviços de nível raiz (dois espaços + nome + dois-pontos)
  # [C4] grep POSIX puro, sem \s
  grep -E "^  [a-z_-]+:" "$COMPOSE_FILE" \
    | tr -d ' :' \
    | sort \
    || echo "(nenhum serviço encontrado)"

  echo ""
  echo "--- Nomes das variáveis de ambiente declaradas para csdash (SEM valores) ---"
  # Extrai linhas do bloco csdash com variáveis no formato "- NOME" ou "- NOME=..."
  # [C4] awk POSIX: [[:space:]] no lugar de \s
  # [C6] cut -d= -f1 garante que somente o nome seja impresso
  awk '
    /^  csdash:/ { in_svc = 1 }
    in_svc && /^  [a-z]/ && !/^  csdash:/ { in_svc = 0 }
    in_svc && /environment:/ { in_env = 1; next }
    in_env && /^[[:space:]]*-[[:space:]]/ {
      line = $0
      sub(/^[[:space:]]*-[[:space:]]*/, "", line)
      split(line, parts, "=")
      print parts[1]
    }
    in_env && /^[[:space:]]+[a-z]/ && !/^[[:space:]]*-/ { in_env = 0 }
  ' "$COMPOSE_FILE" \
    | sort -u \
    || echo "(nenhuma variável encontrada no formato esperado)"

  echo ""
  echo "--- Imagem declarada para csdash ---"
  # [C4] awk POSIX sem \s
  awk '
    /^  csdash:/ { found = 1 }
    found && /^  [a-z]/ && !/^  csdash:/ { found = 0 }
    found && /image:/ { print; found = 0 }
  ' "$COMPOSE_FILE" \
    || echo "(imagem não encontrada no bloco csdash)"

  echo ""
  echo "--- Dependências (depends_on) para csdash ---"
  # [C4] awk POSIX sem \s; [C6] somente nomes de serviços dependentes
  awk '
    /^  csdash:/ { in_svc = 1 }
    in_svc && /^  [a-z]/ && !/^  csdash:/ { in_svc = 0 }
    in_svc && /depends_on:/ { in_dep = 1; next }
    in_dep && /^[[:space:]]*-[[:space:]]/ { print $NF }
    in_dep && /^[[:space:]]+[a-z]/ && !/^[[:space:]]*-/ { in_dep = 0 }
  ' "$COMPOSE_FILE" 2>/dev/null \
    | head -10 \
    || echo "(sem depends_on ou não encontrado)"

  echo ""
  echo "--- Portas declaradas para csdash (somente valores de ports:) ---"
  # [C4/C6] awk POSIX; imprime somente os valores de porta, sem trechos brutos do Compose
  awk '
    /^  csdash:/ { in_svc = 1 }
    in_svc && /^  [a-z]/ && !/^  csdash:/ { in_svc = 0 }
    in_svc && /ports:/ { in_ports = 1; next }
    in_ports && /^[[:space:]]*-[[:space:]]/ { print $NF }
    in_ports && /^[[:space:]]+[a-z]/ && !/^[[:space:]]*-/ { in_ports = 0 }
  ' "$COMPOSE_FILE" 2>/dev/null \
    | head -10 \
    || echo "(sem ports ou não encontrado)"

else
  echo "[AVISO] Arquivo não encontrado: $COMPOSE_FILE"
  echo "Procurando outros arquivos compose em /home/ubuntu..."
  find /home/ubuntu -maxdepth 4 \
    \( -name "docker-compose*.yml" -o -name "compose*.yml" \) \
    2>/dev/null \
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
  echo "HEAD (hash):"
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

  # [C3] Remote URL omitida — pode conter token embutido
  echo ""
  echo "Remote origin: [URL OMITIDA — pode conter credenciais embutidas]"
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
echo "--- Imagens disponíveis (repositório, tag, tamanho, data) ---"
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
echo "--- Redes Docker (nome, driver, escopo) ---"
docker network ls 2>/dev/null || echo "[AVISO] docker network ls falhou"

echo ""
echo "--- Redes do container csdash ---"
docker inspect csdash \
  --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{println}}{{end}}' \
  2>/dev/null \
  || echo "[AVISO] csdash não encontrado"

# ── 8. OUTROS SERVIÇOS ───────────────────────────────────────────────────────
header "8. ESTADO DOS DEMAIS SERVIÇOS"
for SVC in n8n evolution redis postgres nginx traefik; do
  STATUS=$(docker inspect "$SVC" --format '{{.State.Status}}' 2>/dev/null || echo "não encontrado")
  IMAGE=$(docker inspect "$SVC" --format '{{.Config.Image}}' 2>/dev/null || echo "—")
  echo "  $SVC: $STATUS | imagem: $IMAGE"
done

# [C2/C5] Logs REMOVIDOS completamente.
# Filtros por palavras-chave (token, secret, key) não detectam todos os formatos
# de credencial (base64, JWT, UUIDs, URLs codificadas). Logs não devem ser
# coletados em scripts automatizados de diagnóstico.

# ── 9. SUMÁRIO FINAL ─────────────────────────────────────────────────────────
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
