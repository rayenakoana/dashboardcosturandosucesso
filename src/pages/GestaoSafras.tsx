import { useState, useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMetricasDiarias, useUpdateMetricaDiaria } from "@/hooks/useMetricasDiarias";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { Layers, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { toast } from "sonner";

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getMaturationLabel(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff >= 30) return { label: "Madura", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" };
  if (diff >= 14) return { label: "Em maturação", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" };
  if (diff >= 7) return { label: "Recente", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" };
  return { label: "Nova", color: "text-muted-foreground", bg: "bg-muted/20 border-border" };
}

export default function GestaoSafras() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filterFunil, setFilterFunil] = useState("Todos");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: metricas = [] } = useMetricasDiarias();
  const { data: funis = [] } = useConfiguracoes("Funil");
  const updateMutation = useUpdateMetricaDiaria();

  const [editForm, setEditForm] = useState<Record<string, { reunioes_agendadas: string; reunioes_confirmadas: string; compareceram_real: string }>>({});

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const days = daysInMonth(year, month);
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const filteredMetricas = useMemo(() => {
    return metricas.filter(m => {
      if (!m.data.startsWith(monthStr)) return false;
      if (filterFunil !== "Todos" && m.funil !== filterFunil) return false;
      return true;
    });
  }, [metricas, monthStr, filterFunil]);

  // Group by date
  const byDate = useMemo(() => {
    const map: Record<string, typeof metricas> = {};
    filteredMetricas.forEach(m => {
      if (!map[m.data]) map[m.data] = [];
      map[m.data].push(m);
    });
    return map;
  }, [filteredMetricas]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const selectedMetricas = selectedDate ? (byDate[selectedDate] || []) : [];

  const openModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    const items = byDate[dateStr] || [];
    const forms: typeof editForm = {};
    items.forEach(m => {
      forms[m.id] = {
        reunioes_agendadas: String(m.reunioes_agendadas),
        reunioes_confirmadas: String(m.reunioes_confirmadas),
        compareceram_real: String(m.compareceram_real),
      };
    });
    setEditForm(forms);
  };

  const handleSave = (id: string) => {
    const f = editForm[id];
    if (!f) return;
    updateMutation.mutate({
      id,
      reunioes_agendadas: Number(f.reunioes_agendadas) || 0,
      reunioes_confirmadas: Number(f.reunioes_confirmadas) || 0,
      compareceram_real: Number(f.compareceram_real) || 0,
    }, {
      onSuccess: () => toast.success("Conversão atualizada"),
      onError: () => toast.error("Erro ao atualizar"),
    });
  };

  const setField = (id: string, key: string, val: string) => {
    setEditForm(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Layers className="h-8 w-8 text-primary" /> Gestão de Safras
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe a maturação dos leads por data de entrada (Cohort)
        </p>
      </div>

      {/* Controls */}
      <GlassCard className="!py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[140px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Funil</Label>
            <Select value={filterFunil} onValueChange={setFilterFunil}>
              <SelectTrigger className="bg-muted/50 h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {funis.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
          <div key={d} className="text-center text-[10px] uppercase tracking-widest text-muted-foreground font-semibold py-1">{d}</div>
        ))}
        {(() => {
          const firstDay = new Date(year, month, 1).getDay();
          const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-based
          const cells = [];
          for (let i = 0; i < offset; i++) {
            cells.push(<div key={`empty-${i}`} />);
          }
          for (let day = 1; day <= days; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayMetricas = byDate[dateStr] || [];
            const hasData = dayMetricas.length > 0;
            const totalLeads = dayMetricas.reduce((s, m) => s + m.leads_recebidos, 0);
            const totalAgendadas = dayMetricas.reduce((s, m) => s + m.reunioes_agendadas, 0);
            const totalCompareceram = dayMetricas.reduce((s, m) => s + m.compareceram_real, 0);
            const mat = getMaturationLabel(dateStr);
            const isToday = dateStr === new Date().toISOString().split("T")[0];

            cells.push(
              <button
                key={day}
                onClick={() => hasData && openModal(dateStr)}
                className={`rounded-xl border p-2 text-left transition-all min-h-[90px] flex flex-col ${
                  hasData
                    ? `${mat.bg} hover:ring-1 hover:ring-primary/40 cursor-pointer`
                    : "border-border/30 bg-muted/5 opacity-40 cursor-default"
                } ${isToday ? "ring-1 ring-primary/50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
                  {hasData && <span className={`text-[9px] font-medium ${mat.color}`}>{mat.label}</span>}
                </div>
                {hasData && (
                  <div className="mt-auto space-y-0.5">
                    <div className="text-[10px] text-foreground/70">
                      <span className="text-foreground font-semibold">{totalLeads}</span> leads
                    </div>
                    <div className="text-[10px] text-amber-400/80">
                      {totalAgendadas} agend.
                    </div>
                    <div className="text-[10px] text-emerald-400/80">
                      {totalCompareceram} comp.
                    </div>
                  </div>
                )}
              </button>
            );
          }
          return cells;
        })()}
      </div>

      {/* Legend */}
      <GlassCard className="!py-3">
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-muted-foreground font-semibold uppercase tracking-wider">Maturação:</span>
          {[
            { label: "Nova (< 7d)", color: "text-muted-foreground" },
            { label: "Recente (7-13d)", color: "text-blue-400" },
            { label: "Em maturação (14-29d)", color: "text-amber-400" },
            { label: "Madura (30d+)", color: "text-emerald-400" },
          ].map(l => (
            <span key={l.label} className={`${l.color} flex items-center gap-1`}>
              <span className="inline-block w-2 h-2 rounded-full bg-current" /> {l.label}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Modal */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Safra — {selectedDate}
            </DialogTitle>
            <DialogDescription>
              Atualize os dados de conversão desta safra. Os leads recebidos são fixos (dados de entrada).
            </DialogDescription>
          </DialogHeader>

          {selectedMetricas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum registro para esta data.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {selectedMetricas.map(m => {
                const f = editForm[m.id];
                const mat = getMaturationLabel(m.data);
                const pctAgend = m.leads_qualificados > 0 ? ((Number(f?.reunioes_agendadas) || 0) / m.leads_qualificados * 100) : 0;
                const pctShow = (Number(f?.reunioes_agendadas) || 0) > 0 ? ((Number(f?.compareceram_real) || 0) / (Number(f?.reunioes_agendadas) || 1) * 100) : 0;

                return (
                  <div key={m.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{m.funil}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${mat.bg} ${mat.color}`}>
                        {mat.label}
                      </span>
                    </div>

                    {/* Fixed entry data */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-muted/30 p-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Leads Recebidos</span>
                        <p className="text-sm font-bold text-foreground">{m.leads_recebidos}</p>
                      </div>
                      <div className="rounded-md bg-muted/30 p-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">MQL</span>
                        <p className="text-sm font-bold text-foreground">{m.leads_qualificados}</p>
                      </div>
                    </div>

                    {/* Editable conversion data */}
                    {f && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] text-amber-400">Agendadas</Label>
                            <Input
                              type="number" value={f.reunioes_agendadas}
                              onChange={e => setField(m.id, "reunioes_agendadas", e.target.value)}
                              className="bg-amber-400/5 border-amber-400/20 h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-amber-400">Confirmadas</Label>
                            <Input
                              type="number" value={f.reunioes_confirmadas}
                              onChange={e => setField(m.id, "reunioes_confirmadas", e.target.value)}
                              className="bg-amber-400/5 border-amber-400/20 h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-emerald-400">Compareceram</Label>
                            <Input
                              type="number" value={f.compareceram_real}
                              onChange={e => setField(m.id, "compareceram_real", e.target.value)}
                              className="bg-emerald-400/5 border-emerald-400/20 h-8 text-xs"
                            />
                          </div>
                        </div>

                        {/* Live conversion rates */}
                        <div className="flex gap-3 text-[10px]">
                          <span className="text-muted-foreground">% Agendamento: <span className="text-foreground font-semibold">{pctAgend.toFixed(0)}%</span></span>
                          <span className="text-muted-foreground">% Show-up: <span className="text-foreground font-semibold">{pctShow.toFixed(0)}%</span></span>
                        </div>

                        <Button size="sm" className="w-full h-8 text-xs gap-1 bg-primary hover:bg-primary/90"
                          disabled={updateMutation.isPending}
                          onClick={() => handleSave(m.id)}>
                          <Pencil className="h-3 w-3" /> Atualizar Conversão
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
