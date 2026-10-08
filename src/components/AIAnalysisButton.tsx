import { useState, useCallback } from "react";
import { authHeader } from "@/lib/apiClient";
import { Sparkles, X, Loader2, ChevronDown, ChevronUp, RotateCcw, TrendingUp, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── System prompt base ────────────────────────────────────────────────────────

const CS_SYSTEM_PROMPT = `Você é um analista comercial sênior especializado no setor de confecção brasileiro, trabalhando para a Costurando Sucesso (CS).

## Sobre a Costurando Sucesso
- Empresa de treinamento e consultoria exclusivamente para confecções, fundada por Eduardo Cristian
- Única empresa no Brasil dedicada ao crescimento de confecções, do tecido à venda final
- Metodologia CONFPRO Analytics com 8 pilares: Comercial, Operações, Negócios, Financeiro, Processos, Recorrência, Organização, Analytics

## Produtos e funis
- Imersão Paraguai: imersão presencial 3 dias em Ciudad del Este. Ticket: R$ 8.000. Ciclo médio: 8-15 dias.
- Segredos da Confecção: treinamento presencial 3 dias com Eduardo Cristian, metodologia CONFPRO. Ticket: R$ 4.997.
- SupplyTex: imersão 2 dias sobre Supply Chain para confecções. Ticket: ~R$ 3.000-4.000.
- CS Club: membership/assinatura. Clientes de maior LTV e renovação.

## Benchmarks CS
- Agendamento (lead → reunião): meta 50%
- Show-up (agendado → compareceu): meta 70%
- Fechamento (proposta → venda): meta 30%
- Ticket médio esperado: ~R$ 6.500-7.000
- Motivo de perda mais comum historicamente: Lead Inativo / Ghosting

## Regras ABSOLUTAS
1. Todos os números DEVEM vir dos dados fornecidos. Nunca estime ou invente.
2. Máximo 2 insights por coluna — diretos e com número real.
3. Sem bullet points no JSON. Strings diretas.
4. Tom de analista experiente em confecção, direto, sem elogios.
5. Responda APENAS com JSON válido, sem texto antes ou depois.`;

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  titulo: string;
  resumo: string;
  insights: string[];   // 2 itens — pontos positivos ou neutros
  alertas: string[];    // 2 itens — problemas reais com número
  acoes: string[];      // 3 itens — ações acionáveis e específicas
}

interface AIAnalysisButtonProps {
  section: string;
  dataPayload: Record<string, any>;
  className?: string;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function AIAnalysisButton({ section, dataPayload, className }: AIAnalysisButtonProps) {
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<AnalysisResult | null>(null);
  const [error, setError]       = useState("");

  const runAnalysis = useCallback(async () => {
    if (loading) return;
    setOpen(true);
    if (result) return; // já tem resultado, só abre
    setLoading(true);
    setError("");

    const userMessage = `Analise a seção "${section}" com os dados reais abaixo e responda APENAS com este JSON exato:

{
  "titulo": "título curto da análise (máx 6 palavras)",
  "resumo": "1 frase direta resumindo o diagnóstico do período com números reais",
  "insights": [
    "ponto positivo 1 — com número real do dado",
    "ponto positivo 2 — com número real do dado"
  ],
  "alertas": [
    "problema crítico 1 — com número e impacto concreto",
    "problema crítico 2 — com número e impacto concreto"
  ],
  "acoes": [
    "ação específica e acionável 1 para a equipe CS",
    "ação específica e acionável 2",
    "ação específica e acionável 3"
  ]
}

DADOS REAIS:
${JSON.stringify(dataPayload, null, 2)}`;

    try {
      const auth = await authHeader();
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: CS_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const text = json?.content?.[0]?.text ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Sem JSON na resposta");
      const parsed: AnalysisResult = JSON.parse(match[0]);
      if (!parsed.insights || !parsed.alertas || !parsed.acoes) throw new Error("Estrutura inválida");
      setResult(parsed);
    } catch (e: unknown) {
      setError("Erro ao gerar análise. Tente novamente.");
      console.error("[AIAnalysis]", e);
    } finally {
      setLoading(false);
    }
  }, [section, dataPayload, result, loading]);

  const rerun = useCallback(() => {
    setResult(null);
    setError("");
    setOpen(true);
    setLoading(false);
    // dispara novo fetch via useEffect-like: chama runAnalysis após reset
    setTimeout(() => {
      setLoading(true);
      setError("");
      const userMessage = `Analise a seção "${section}" com os dados reais abaixo e responda APENAS com este JSON exato:

{
  "titulo": "título curto da análise (máx 6 palavras)",
  "resumo": "1 frase direta resumindo o diagnóstico do período com números reais",
  "insights": [
    "ponto positivo 1 — com número real do dado",
    "ponto positivo 2 — com número real do dado"
  ],
  "alertas": [
    "problema crítico 1 — com número e impacto concreto",
    "problema crítico 2 — com número e impacto concreto"
  ],
  "acoes": [
    "ação específica e acionável 1 para a equipe CS",
    "ação específica e acionável 2",
    "ação específica e acionável 3"
  ]
}

DADOS REAIS:
${JSON.stringify(dataPayload, null, 2)}`;

      authHeader()
        .then(auth => fetch("/api/claude", {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 800,
            system: CS_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userMessage }],
          }),
        }))
        .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
        .then(json => {
          const text = json?.content?.[0]?.text ?? "";
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("Sem JSON");
          const parsed: AnalysisResult = JSON.parse(match[0]);
          setResult(parsed);
        })
        .catch(e => { setError("Erro ao gerar análise."); console.error(e); })
        .finally(() => setLoading(false));
    }, 50);
  }, [section, dataPayload]);

  return (
    <div className={cn("w-full", className)}>
      {/* Botão trigger — estilo igual ao EmailMarketing */}
      {!open && (
        <button
          onClick={runAnalysis}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/70 transition-all"
        >
          <Sparkles className="h-3 w-3" />
          Analisar
        </button>
      )}

      {/* Painel expandido — inline, largura total */}
      {open && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm overflow-hidden">
          {/* Header do painel */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-primary/5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Análise IA — {section}
              </span>
              {result && (
                <span className="text-[10px] text-muted-foreground ml-1">· {result.titulo}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {result && !loading && (
                <button
                  onClick={rerun}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                >
                  <RotateCcw className="h-3 w-3" /> Regerar
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="px-5 py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-[11px] text-muted-foreground">Analisando dados reais do período...</p>
              <div className="flex gap-1.5 mt-1">
                {[0,1,2].map(i => (
                  <div key={i} className="h-1 rounded-full bg-primary/30 animate-pulse" style={{ width: 40 + i * 16, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Erro */}
          {error && !loading && (
            <div className="px-5 py-6 flex items-center justify-between">
              <p className="text-xs text-primary">{error}</p>
              <button onClick={rerun} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors">
                <RotateCcw className="h-3 w-3" /> Tentar novamente
              </button>
            </div>
          )}

          {/* Resultado */}
          {result && !loading && (
            <div className="p-5 space-y-5">
              {/* Resumo */}
              <p className="text-[12px] text-foreground/80 leading-relaxed border-l-2 border-primary/50 pl-3">
                {result.resumo}
              </p>

              {/* 3 colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Insights */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-3">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                      Pontos positivos
                    </p>
                  </div>
                  {result.insights.map((item, i) => (
                    <div key={i} className="flex gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                      <span className="text-emerald-400 font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-[11px] text-foreground/85 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>

                {/* Alertas */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Pontos de atenção
                    </p>
                  </div>
                  {result.alertas.map((item, i) => (
                    <div key={i} className="flex gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
                      <span className="text-primary font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-[11px] text-foreground/85 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>

                {/* Ações */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Zap className="h-3.5 w-3.5 text-yellow-400" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                      Ações prioritárias
                    </p>
                  </div>
                  {result.acoes.map((item, i) => (
                    <div key={i} className="flex gap-2.5 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
                      <span className="text-yellow-400 font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-[11px] text-foreground/85 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
