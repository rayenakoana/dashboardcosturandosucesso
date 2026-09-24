import { useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CS_SYSTEM_PROMPT = `Você é um analista comercial especializado no setor de confecção brasileiro, trabalhando para a Costurando Sucesso (CS).

## Sobre a Costurando Sucesso
- Empresa de treinamento e consultoria exclusivamente para confecções, fundada por Eduardo Cristian
- Única empresa no Brasil dedicada ao crescimento de confecções, do tecido à venda final
- Metodologia CONFPRO Analytics com 8 pilares: Comercial, Operações, Negócios, Financeiro, Processos, Recorrência, Organização, Analytics

## Produtos e funis
- Imersão Paraguai: imersão presencial 3 dias em Ciudad del Este. Ticket: R$ 8.000. Ciclo médio: 8-15 dias. Público: donos que buscam expansão internacional.
- Segredos da Confecção: treinamento presencial 3 dias com Eduardo Cristian, metodologia CONFPRO. Ticket: R$ 4.997. Ciclo médio: 4-8 dias.
- SupplyTex: imersão 2 dias sobre Supply Chain para confecções. Ticket: ~R$ 3.000-4.000.
- CS Club: membership/assinatura. Clientes de maior LTV e renovação.

## Metas e benchmarks
- Agendamento (lead → reunião): meta 50%
- Show-up (agendado → compareceu): meta 70%
- Fechamento (proposta → venda): meta 30%
- Ticket médio esperado: ~R$ 6.500-7.000
- Motivo de perda mais comum historicamente: Lead Inativo / Ghosting

## Regras ABSOLUTAS — nunca viole
1. Todos os números na análise DEVEM vir dos dados fornecidos. Nunca estime ou invente valores.
2. Se um dado não foi fornecido, diga "não tenho esse dado disponível" — nunca fabrique.
3. Máximo 3 insights, do mais crítico ao menos crítico.
4. Sem bullet points. Texto corrido, parágrafos curtos, linguagem direta.
5. Tom de analista experiente em confecção, não de chatbot genérico.
6. Não elogie os dados nem seja motivacional. Seja direto e analítico.`;

interface AIAnalysisButtonProps {
  section: string;
  dataPayload: Record<string, any>;
  className?: string;
}

export function AIAnalysisButton({ section, dataPayload, className }: AIAnalysisButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function runAnalysis() {
    if (analysis) { setOpen(true); return; }
    setOpen(true);
    setLoading(true);
    setError("");

    const userMessage = `Analise a seção "${section}" com os seguintes dados reais do período selecionado:\n\n${JSON.stringify(dataPayload, null, 2)}`;

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY ?? "";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          system: CS_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      const json = await res.json();
      const text = json?.content?.[0]?.text ?? "";
      setAnalysis(text || "Não foi possível gerar a análise.");
    } catch (e) {
      setError("Erro ao conectar com a IA. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={runAnalysis}
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1.5 rounded-full border border-primary/30 text-primary/80 hover:bg-primary/10 hover:border-primary/60 transition-all"
      >
        <Sparkles className="h-3 w-3" />
        Analisar
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Análise IA</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Analisando dados reais...
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {!loading && analysis && (
            <div className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">{analysis}</div>
          )}

          {!loading && analysis && (
            <button
              onClick={() => { setAnalysis(""); runAnalysis(); }}
              className="mt-3 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              ↺ Reanalisar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
