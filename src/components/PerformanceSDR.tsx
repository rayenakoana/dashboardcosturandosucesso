import { GlassCard } from "@/components/GlassCard";
import { usePerformanceSDR, formatTempo } from "@/hooks/useSDRs";
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
  funil?: string;
  periodoStart?: Date;
  periodoEnd?: Date;
}

export function PerformanceSDR({ funil, periodoStart, periodoEnd }: PerformanceSDRProps) {
  const { data: performance = [], isLoading } = usePerformanceSDR(funil, periodoStart, periodoEnd);

  if (isLoading) {
    return <GlassCard><p className="text-muted-foreground text-sm">Carregando performance dos SDRs...</p></GlassCard>;
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

  return (
    <div className="space-y-4">
      {performance.map((p, idx) => (
        <GlassCard key={p.sdr.id} className={cn(idx === 0 && "border-primary/45 shadow-[0_0_26px_-6px_hsl(var(--primary)/0.25)]")}>
          <div className="flex items-center gap-3.5 mb-4">
            <div className={cn(
              "w-[50px] h-[50px] rounded-full border-2 flex items-center justify-center text-base font-semibold overflow-hidden flex-shrink-0",
              idx === 0 ? "border-primary text-primary" : "border-border text-muted-foreground bg-muted"
            )}>
              {p.sdr.foto_url ? <img src={p.sdr.foto_url} alt={p.sdr.nome} className="w-full h-full object-cover" /> : initials(p.sdr.nome)}
            </div>
            <div>
              <div className="text-lg font-semibold flex items-center gap-2 flex-wrap">
                {p.sdr.nome}
                {idx === 0 && <span className="text-primary text-xs font-bold tracking-wide">#1 EM QUALIFICAÇÕES</span>}
              </div>
              <div className="text-xs text-muted-foreground">SDR</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Tile n={p.tarefasConcluidas} label="Tarefas concluídas" />
            <Tile n={p.tarefasAgendadas} label="Tarefas agendadas" />
            <Tile n={p.dealsSobResponsabilidade} label="Deals sob responsabilidade" />
            <Tile n={p.qualificacoes} label="Qualificações" variant="gold" />
            <Tile n={p.dealsEsfriando} label="Deals esfriando" variant="warn" />
            <Tile n={p.dealsEmAndamento} label="Deals em andamento" />
            <Tile n={formatTempo(p.tempoMedioPrimeiroContatoMs)} label="Tempo médio 1º contato" />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
