import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { usePerformanceSDR, formatTempo, type SDRPerformance } from "@/hooks/useSDRs";
import { cn } from "@/lib/utils";

function initials(nome: string) {
  return nome.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function Tile({ n, label, variant }: { n: string | number; label: string; variant?: "gold" | "warn" | "red" }) {
  return (
    <div className={cn(
      "rounded-xl border p-3 bg-white/[0.03] border-white/[0.06]",
      variant === "warn" && "border-sky-500/30",
    )}>
      <div className={cn(
        "text-2xl font-bold leading-none",
        variant === "gold" && "text-primary",
        variant === "warn" && "text-sky-400",
        variant === "red" && "text-destructive",
      )}>
        {n}
      </div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mt-1.5 leading-tight">{label}</div>
    </div>
  );
}

interface PerformanceSDRProps {
  funil?: string | string[];
  periodoStart?: Date;
  periodoEnd?: Date;
}

export function PerformanceSDR({ funil, periodoStart, periodoEnd }: PerformanceSDRProps) {
  const { data: performance = [], isLoading, isError, error } = usePerformanceSDR(funil, periodoStart, periodoEnd);
  const [modoSDR, setModoSDR] = useState<
    "volume" | "conversao" | "tempo" | "atividades"
  >("volume");

  if (isLoading) {
    return <GlassCard><p className="text-muted-foreground text-sm">Carregando performance dos SDRs...</p></GlassCard>;
  }

  if (isError) {
    return (
      <GlassCard>
        <p className="text-destructive text-sm">
          Erro ao carregar performance dos SDRs: {error instanceof Error ? error.message : "erro desconhecido"}
        </p>
      </GlassCard>
    );
  }

  if (performance.length === 0) {
    return (
      <GlassCard>
        <p className="text-muted-foreground text-sm">
          Nenhum SDR ativo vinculado ao RD Station ainda. Cadastre em Configurações → Equipe de SDR.
        </p>
      </GlassCard>
    );
  }

  const ranking = [...performance].sort(
    (a, b) => b.qualificacoes - a.qualificacoes
  );

  const colunas: {
    titulo: string;
    valor: (p: SDRPerformance) => React.ReactNode;
  }[] = modoSDR === "volume" ? [
    { titulo: "Carteira total", valor: p => p.dealsSobResponsabilidade.toLocaleString("pt-BR") },
    { titulo: "Em andamento", valor: p => p.dealsEmAndamento.toLocaleString("pt-BR") },
    { titulo: "Qualificações", valor: p => p.qualificacoes },
    { titulo: "Esfriando", valor: p => (
      <span className={p.dealsEsfriando > 0 ? "text-red-400" : "text-emerald-400"}>
        {p.dealsEsfriando.toLocaleString("pt-BR")}
      </span>
    ) },
  ] : modoSDR === "conversao" ? [
    { titulo: "Leads da coorte", valor: p => p.leadsCriadosPeriodo },
    { titulo: "Qualificados na coorte", valor: p => p.leadsCriadosQualificadosPeriodo },
    { titulo: "Conversão da coorte", valor: p =>
      p.leadsCriadosPeriodo > 0
        ? `${(100 * p.leadsCriadosQualificadosPeriodo / p.leadsCriadosPeriodo).toFixed(1)}%`
        : "—"
    },
    { titulo: "Qualificações no período", valor: p => p.qualificacoes },
  ] : modoSDR === "tempo" ? [
    { titulo: "Tempo médio 1º contato", valor: p => formatTempo(p.tempoMedioPrimeiroContatoMs) },
    { titulo: "Negócios na amostra", valor: p => p.amostraPrimeiroContato },
    { titulo: "Sem última atividade", valor: p => p.dealsSemUltimaAtividade.toLocaleString("pt-BR") },
  ] : [
    { titulo: "Concluídas", valor: p => p.tarefasConcluidas },
    { titulo: "Agendadas", valor: p => p.tarefasAgendadas },
    { titulo: "Total de tarefas", valor: p => p.tarefasConcluidas + p.tarefasAgendadas },
  ];

  // Interpretação do modo selecionado, sem novas consultas.
  const resumoExecutivoSDR = (() => {
    if (modoSDR === "volume") {
      const dados = ranking.map(p => {
        const abertos = p.dealsSobResponsabilidade -
          (p.dealsSobResponsabilidade - p.dealsEmAndamento -
           p.dealsEsfriando > 0 ? 0 : 0);

        const proporcao = p.dealsSobResponsabilidade > 0
          ? 100 * p.dealsEsfriando / p.dealsSobResponsabilidade
          : null;

        return { p, abertos, proporcao };
      }).filter(x => x.proporcao !== null);

      const maior = [...dados].sort(
        (a, b) => (b.proporcao ?? 0) - (a.proporcao ?? 0)
      )[0];

      return {
        titulo: "Exposição da carteira",
        destaque: maior?.p.sdr.nome ?? "Sem dados",
        descricao: maior
          ? `${maior.proporcao!.toFixed(1)}% dos negócios sob responsabilidade apresentam última atividade há mais de 3 dias. Percentual sobre a carteira total, não apenas negócios abertos; registros sem data de atividade não entram no numerador.`
          : "Sem carteira suficiente para comparação de risco.",
      };
    }

    if (modoSDR === "conversao") {
      const dados = ranking
        .filter(p => p.leadsCriadosPeriodo > 0)
        .map(p => ({
          p,
          taxa: 100 * p.leadsCriadosQualificadosPeriodo / p.leadsCriadosPeriodo,
        }))
        .sort((a, b) => b.taxa - a.taxa);

      const melhor = dados[0];
      const segundo = dados[1];

      return {
        titulo: "Comparação de qualificação",
        destaque: melhor?.p.sdr.nome ?? "Sem amostra",
        descricao: melhor
          ? segundo
            ? `Taxa de ${melhor.taxa.toFixed(1)}% sobre ${melhor.p.leadsCriadosPeriodo} negócios, contra ${segundo.taxa.toFixed(1)}% sobre ${segundo.p.leadsCriadosPeriodo}. Diferença de ${(melhor.taxa - segundo.taxa).toFixed(1)} p.p.; amostras distintas não permitem concluir superioridade definitiva.`
            : `Taxa de ${melhor.taxa.toFixed(1)}% em ${melhor.p.leadsCriadosPeriodo} negócios. Não há outro SDR com amostra para comparação.`
          : "Sem dados suficientes para comparar a qualificação.",
      };
    }

    if (modoSDR === "tempo") {
      const dados = ranking.filter(
        p => p.tempoMedioPrimeiroContatoMs !== null &&
             p.amostraPrimeiroContato > 0
      ).sort(
        (a, b) =>
          (a.tempoMedioPrimeiroContatoMs ?? Infinity) -
          (b.tempoMedioPrimeiroContatoMs ?? Infinity)
      );

      const primeiro = dados[0];
      const segundo = dados[1];

      return {
        titulo: "Comparação de agilidade",
        destaque: primeiro?.sdr.nome ?? "Sem amostra",
        descricao: primeiro
          ? segundo
            ? `Tempo médio de ${formatTempo(primeiro.tempoMedioPrimeiroContatoMs)} (${primeiro.amostraPrimeiroContato} negócios), contra ${formatTempo(segundo.tempoMedioPrimeiroContatoMs)} (${segundo.amostraPrimeiroContato} negócios). Diferença de ${formatTempo((segundo.tempoMedioPrimeiroContatoMs ?? 0) - (primeiro.tempoMedioPrimeiroContatoMs ?? 0))}. Interpretar considerando as amostras.`
            : `Tempo médio de ${formatTempo(primeiro.tempoMedioPrimeiroContatoMs)}, calculado sobre ${primeiro.amostraPrimeiroContato} negócios.`
          : "Sem amostra suficiente para comparação.",
      };
    }

    const dados = [...ranking].sort(
      (a, b) => b.tarefasConcluidas - a.tarefasConcluidas
    );
    const primeiro = dados[0];
    const segundo = dados[1];

    return {
      titulo: "Comparação de execução",
      destaque: primeiro?.sdr.nome ?? "Sem dados",
      descricao: primeiro
        ? segundo
          ? `${primeiro.tarefasConcluidas} tarefas concluídas, contra ${segundo.tarefasConcluidas} do outro SDR. Diferença de ${primeiro.tarefasConcluidas - segundo.tarefasConcluidas} tarefas no período. Volume não equivale a produtividade sem considerar distribuição da carteira e complexidade.`
          : `${primeiro.tarefasConcluidas} tarefas concluídas no período.`
        : "Sem registros de atividades para comparação.",
    };
  })();


  return (
    <div className="glass-card cs-sdr-executive-unified cs-sdr-ux-v6 !p-5 sm:!p-6 grid grid-cols-1 min-[1450px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-4 items-start">
      {/* Cabeçalho geral SDR */}
      <div className="min-w-0 min-[1450px]:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold tracking-tight">
              PERFORMANCE POR SDR
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Comparativo de desempenho da equipe comercial
            </p>
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-[11px] text-muted-foreground mr-2">
              {ranking.length} SDRs
            </span>

            <div className="grid grid-cols-2 w-full gap-1 rounded-lg border border-border/40 bg-white/[0.025] p-1 sm:inline-flex sm:w-auto sm:flex-wrap cs-sdr-mobile-v10">
              {([
                ["volume", "Volume"],
                ["conversao", "Conversão"],
                ["tempo", "Tempo médio"],
                ["atividades", "Atividades"],
              ] as const).map(([valor, label]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={modoSDR === valor}
                  onClick={() => setModoSDR(valor)}
                  className={cn(
                    "w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-md text-center text-[11px] font-semibold transition-colors",
                    modoSDR === valor
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
      <div className="min-w-0">
        {modoSDR === "conversao" && (
          <div className="mb-4 rounded-lg border border-border/40 bg-white/[0.02] px-4 py-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Conversão da coorte: negócios criados no período e que
              também foram qualificados no período, por SDR.
              É uma métrica da base de acompanhamento SDR, não a
              conversão geral do funil. As demais etapas comerciais
              ainda não possuem uma coorte individual validada aqui.
            </p>
          </div>
        )}

        <p className="sm:hidden mb-2 text-right text-[11px] font-medium text-muted-foreground" id="cs-sdr-scroll-hint-v10">Deslize a tabela para ver mais indicadores →</p>

        <div className="overflow-x-auto rounded-lg border border-border/30" tabIndex={0} aria-label="Tabela de desempenho dos SDRs, com rolagem horizontal" aria-describedby="cs-sdr-scroll-hint-v10">
          <table className="w-full min-w-[790px] table-fixed text-[13px] tabular-nums">
            <colgroup>
              <col style={{ width: "24%" }} />
              {colunas.map((coluna) => (
                <col key={coluna.titulo}
                  style={{ width: `${76 / colunas.length}%` }} />
              ))}
            </colgroup>

            <thead>
              <tr className="bg-white/[0.045] border-b border-border/40">
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                  SDR
                </th>
                {colunas.map(coluna => (
                  <th key={coluna.titulo}
                    className="px-2 py-3 text-center text-[11px] uppercase tracking-[0.04em] text-muted-foreground font-semibold">
                    {coluna.titulo}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {ranking.map((p) => (
                <tr key={p.sdr.id}
                  className="border-b border-border/25 last:border-0 hover:bg-white/[0.035] transition-colors">
                  <td className="px-4 py-3 text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-primary/15 border border-primary/25 flex items-center justify-center">
                        {p.sdr.foto_url ? (
                          <img src={p.sdr.foto_url}
                            alt={p.sdr.nome}
                            className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[11px] font-bold text-primary">
                            {initials(p.sdr.nome)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {p.sdr.nome}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          SDR
                        </p>
                      </div>
                    </div>
                  </td>

                  {colunas.map(coluna => (
                    <td key={coluna.titulo}
                      className="px-2 py-4 text-center align-middle font-semibold whitespace-nowrap text-foreground">
                      {coluna.valor(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[12px] text-muted-foreground">
          <span>Qualificações e tarefas: período selecionado</span>
          <span>Carteira e leads esfriando: situação atual</span>
        </div>
      {/* Leitura contextual do modo selecionado */}
      <div className="cs-sdr-reading-v9 grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-4 border-t border-white/[0.08] pt-4 mt-4">
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
            Leitura executiva
          </span>
          <p className="text-[13px] font-semibold text-foreground mt-2">
            {resumoExecutivoSDR.titulo}
          </p>
          <p className="text-[17px] font-bold text-foreground mt-2">
            {resumoExecutivoSDR.destaque}
          </p>
        </div>

        <div className="min-w-0 md:border-l md:border-white/[0.08] md:pl-5 flex items-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {resumoExecutivoSDR.descricao}
          </p>
        </div>
      </div>
      </div>


      {/* Painéis SDR — refinamento executivo V7 */}
      <div className="cs-sdr-compacto-v3 cs-sdr-ux-v7 cs-sdr-altura-natural-v8 min-w-0
        min-[1450px]:order-2 grid grid-cols-1 md:grid-cols-3
        gap-3 items-start">

        {/* TEMPO DE CONTATO */}
        <section className="min-w-0 h-auto flex flex-col
          rounded-xl border border-white/[0.08]
          bg-white/[0.018] p-4">

          <h3 className="text-[14px] font-bold uppercase
            leading-snug">
            Tempo de primeiro contato
          </h3>
          <p className="text-[12px] text-muted-foreground mt-1 mb-3">
            Média por SDR
          </p>

          <div className="space-y-2">
            {ranking.map(p => (
              <div key={p.sdr.id}
                className="py-2 border-b border-white/[0.06]
                last:border-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium truncate">
                    {p.sdr.nome}
                  </span>
                  <strong className="text-[17px] tabular-nums
                    whitespace-nowrap">
                    {formatTempo(p.tempoMedioPrimeiroContatoMs)}
                  </strong>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">
                  {p.amostraPrimeiroContato} negócios no cálculo
                </p>
              </div>
            ))}
          </div>

          <details className="mt-4 pt-4 text-[12px]
            text-muted-foreground">
            <summary className="cursor-pointer">
              Critério de cálculo
            </summary>
            <p className="mt-2 leading-relaxed">
              Apenas negócios com datas de criação e primeiro
              andamento disponíveis.
            </p>
          </details>
        </section>

        {/* LEADS EM RISCO */}
        <section className="min-w-0 h-auto flex flex-col
          rounded-xl border border-white/[0.08]
          bg-white/[0.018] p-4">

          <h3 className="text-[14px] font-bold uppercase leading-snug">
            Leads em risco
          </h3>
          <p className="text-[12px] text-muted-foreground mt-1">
            Carteira atual
          </p>

          <div className="mt-3 mb-3">
            <p className="text-[26px] font-bold text-red-400
              tabular-nums leading-none">
              {ranking.reduce((s, p) => s + p.dealsEsfriando, 0)}
            </p>
            <p className="text-[12px] text-muted-foreground mt-2">
              Negócios esfriando
            </p>
          </div>

          <div className="space-y-2">
            {ranking.map(p => (
              <div key={p.sdr.id}
                className="flex justify-between items-center gap-2
                  text-[12px]">
                <span className="truncate">{p.sdr.nome}</span>
                <strong className="text-red-400 tabular-nums">
                  {p.dealsEsfriando}
                </strong>
              </div>
            ))}
          </div>

          <details className="mt-4 pt-4 text-[12px]
            text-muted-foreground">
            <summary className="cursor-pointer">
              Critério de risco
            </summary>
            <p className="mt-2 leading-relaxed">
              Negócios abertos com última atividade há mais de
              3 dias.
            </p>
            <p className="mt-2">
              Sem última atividade informada:
              {' '}
              {ranking.reduce(
                (s, p) => s + p.dealsSemUltimaAtividade, 0
              )}.
              Esses negócios não recebem classificação de risco.
            </p>
          </details>
        </section>

        {/* ATIVIDADES DOS SDRS */}
        <section className="min-w-0 h-auto flex flex-col
          rounded-xl border border-white/[0.08]
          bg-white/[0.018] p-4">

          <h3 className="text-[14px] font-bold uppercase leading-snug">
            Atividades dos SDRs
          </h3>
          <p className="text-[12px] text-muted-foreground mt-1">
            Período selecionado
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3 mb-4">
            <div>
              <p className="text-[24px] font-bold tabular-nums
                leading-none">
                {ranking.reduce(
                  (s, p) => s + p.tarefasConcluidas, 0
                )}
              </p>
              <p className="text-[12px] text-muted-foreground mt-2">
                Concluídas
              </p>
            </div>
            <div>
              <p className="text-[21px] font-bold tabular-nums
                leading-none">
                {ranking.reduce(
                  (s, p) => s + p.tarefasAgendadas, 0
                )}
              </p>
              <p className="text-[12px] text-muted-foreground mt-2">
                Agendadas
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {ranking.map(p => {
              const maximo = Math.max(
                ...ranking.map(r => r.tarefasConcluidas), 1
              );

              return (
                <div key={p.sdr.id} className="space-y-1">
                  <div className="flex justify-between gap-2
                    text-[12px]">
                    <span className="truncate">{p.sdr.nome}</span>
                    <strong className="tabular-nums">
                      {p.tarefasConcluidas}
                    </strong>
                  </div>

                  <div className="h-1.5 bg-white/[0.08]
                    rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full"
                      style={{
                        width: `${
                          p.tarefasConcluidas / maximo * 100
                        }%`
                      }}
                    />
                  </div>

                  <p className="text-[12px] text-muted-foreground">
                    {p.tarefasAgendadas} agendadas
                  </p>
                </div>
              );
            })}
          </div>

          <details className="mt-4 pt-4 text-[12px]
            text-muted-foreground">
            <summary className="cursor-pointer">
              Como ler as barras
            </summary>
            <p className="mt-2 leading-relaxed">
              Barras representam atividades concluídas,
              comparadas ao maior volume exibido.
              Não representam taxa de conclusão.
            </p>
          </details>
        </section>
      </div>

      <p className="min-[1450px]:col-span-2 min-[1450px]:order-4 text-[13px] text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2">
        Qualificações contam a partir de 11/08/2026 — negociações qualificadas antes dessa data não entram na contagem.
      </p>

    </div>
  );
}
