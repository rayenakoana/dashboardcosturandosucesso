import { useMemo } from "react";
import { GlassCard } from "./GlassCard";
import { useSDRs } from "@/hooks/useSDRs";
import { useMetricasDiarias } from "@/hooks/useMetricasDiarias";
import { Users } from "lucide-react";

interface Props {
  start: string;
  end: string;
}

export function SDRPodium({ start, end }: Props) {
  const { data: sdrs = [] } = useSDRs();
  const { data: metricas = [] } = useMetricasDiarias();

  const rows = useMemo(() => {
    return sdrs.map((sdr) => {
      const mine = metricas.filter(
        (m) => (m as any).sdr_id === sdr.id && m.data >= start && m.data <= end
      );
      const leads = mine.reduce((s, m) => s + (m.leads_recebidos || 0), 0);
      const agendadas = mine.reduce((s, m) => s + (m.reunioes_agendadas || 0), 0);
      const conv = leads > 0 ? (agendadas / leads) * 100 : 0;
      return { sdr, leads, agendadas, conv };
    }).sort((a, b) => b.agendadas - a.agendadas);
  }, [sdrs, metricas, start, end]);

  if (rows.length === 0) return null;

  // podium heights (visual, no ranking labels)
  const heights = ["h-40", "h-32", "h-28"];

  const initials = (nome: string) =>
    nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-display font-bold text-xl tracking-wide">Performance por SDR</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {rows.slice(0, 3).map((r, i) => (
          <div key={r.sdr.id} className="flex flex-col items-center">
            {/* avatar */}
            <div className="relative mb-3">
              <div className="h-20 w-20 rounded-full bg-gradient-red p-[2px]">
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                  {r.sdr.foto_url ? (
                    <img src={r.sdr.foto_url} alt={r.sdr.nome} className="h-full w-full object-cover rounded-full" />
                  ) : (
                    <span className="font-display font-bold text-2xl text-foreground">
                      {initials(r.sdr.nome)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="font-display font-semibold text-base text-foreground mb-3 text-center">
              {r.sdr.nome}
            </p>

            {/* podium block */}
            <div className={`${heights[i]} w-full rounded-t-xl bg-gradient-to-t from-primary/30 via-primary/10 to-transparent border border-primary/20 flex flex-col justify-center gap-3 p-4`}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Leads</span>
                <span className="font-display font-bold text-lg text-foreground">{r.leads}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Agendadas</span>
                <span className="font-display font-bold text-lg text-gradient-gold">{r.agendadas}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Conversão</span>
                <span className="font-display font-bold text-lg text-foreground">{r.conv.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rows.length > 3 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.slice(3).map((r) => (
            <div key={r.sdr.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="h-10 w-10 rounded-full bg-gradient-red/40 flex items-center justify-center text-xs font-display font-bold">
                {r.sdr.foto_url
                  ? <img src={r.sdr.foto_url} alt={r.sdr.nome} className="h-full w-full object-cover rounded-full" />
                  : initials(r.sdr.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.sdr.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {r.leads} leads · {r.agendadas} agend · {r.conv.toFixed(0)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
