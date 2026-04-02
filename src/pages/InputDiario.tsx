import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMetricasDiarias, useAddMetricaDiaria, useUpdateMetricaDiaria, useDeleteMetricaDiaria } from "@/hooks/useMetricasDiarias";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { sendToWebhook } from "@/hooks/useWebhook";
import { Plus, Trash2, Download, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().split("T")[0];

const initialForm = {
  data: today(),
  funil: "",
  leads_recebidos: "",
  leads_qualificados: "",
  reunioes_agendadas: "",
  reunioes_confirmadas: "",
  compareceram_real: "",
};

export default function InputDiario() {
  const { data: metricas = [] } = useMetricasDiarias();
  const addMutation = useAddMetricaDiaria();
  const updateMutation = useUpdateMetricaDiaria();
  const deleteMutation = useDeleteMetricaDiaria();
  const { data: funis = [] } = useConfiguracoes("Funil");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm({ ...initialForm, data: today() });
    setEditingId(null);
  };

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setForm({
      data: m.data,
      funil: m.funil,
      leads_recebidos: String(m.leads_recebidos),
      leads_qualificados: String(m.leads_qualificados),
      reunioes_agendadas: String(m.reunioes_agendadas),
      reunioes_confirmadas: String(m.reunioes_confirmadas),
      compareceram_real: String(m.compareceram_real),
    });
  };

  const handleSubmit = () => {
    if (!form.funil) { toast.error("Selecione um funil"); return; }
    const payload = {
      data: form.data,
      funil: form.funil,
      leads_recebidos: Number(form.leads_recebidos) || 0,
      leads_qualificados: Number(form.leads_qualificados) || 0,
      reunioes_agendadas: Number(form.reunioes_agendadas) || 0,
      reunioes_confirmadas: Number(form.reunioes_confirmadas) || 0,
      compareceram_real: Number(form.compareceram_real) || 0,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload }, {
        onSuccess: () => {
          sendToWebhook("metrica_diaria_atualizada", { id: editingId, ...payload });
          toast.success("Métrica atualizada");
          resetForm();
        },
        onError: () => toast.error("Erro ao atualizar"),
      });
    } else {
      addMutation.mutate(payload, {
        onSuccess: () => {
          sendToWebhook("metrica_diaria", payload);
          toast.success("Métricas salvas");
          resetForm();
        },
        onError: () => toast.error("Erro ao salvar"),
      });
    }
  };

  const exportCSV = () => {
    const header = "Data,Funil,Leads Recebidos,Leads Qualificados,Reuniões Agendadas,Reuniões Confirmadas,Compareceram Real\n";
    const rows = metricas.map(m => `${m.data},${m.funil},${m.leads_recebidos},${m.leads_qualificados},${m.reunioes_agendadas},${m.reunioes_confirmadas},${m.compareceram_real}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "metricas_diarias.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Input Diário</h1>
          <p className="text-muted-foreground text-sm mt-1">Lançamento em massa de métricas por funil</p>
        </div>
        <Button variant="outline" className="gap-1 text-xs" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {editingId ? "Editando Lançamento" : "Novo Lançamento"}
          </h2>
          {editingId && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={resetForm}>
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" value={form.data} onChange={e => set("data", e.target.value)} className="bg-muted/50 h-9 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Funil</Label>
            <Select value={form.funil} onValueChange={v => set("funil", v)}>
              <SelectTrigger className="bg-muted/50 h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{funis.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Leads Recebidos</Label>
            <Input type="number" value={form.leads_recebidos} onChange={e => set("leads_recebidos", e.target.value)} className="bg-muted/50 h-9 text-xs" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Leads Qualificados (MQL)</Label>
            <Input type="number" value={form.leads_qualificados} onChange={e => set("leads_qualificados", e.target.value)} className="bg-muted/50 h-9 text-xs" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Reuniões Agendadas</Label>
            <Input type="number" value={form.reunioes_agendadas} onChange={e => set("reunioes_agendadas", e.target.value)} className="bg-muted/50 h-9 text-xs" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Reuniões Confirmadas</Label>
            <Input type="number" value={form.reunioes_confirmadas} onChange={e => set("reunioes_confirmadas", e.target.value)} className="bg-muted/50 h-9 text-xs" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Compareceram Real</Label>
            <Input type="number" value={form.compareceram_real} onChange={e => set("compareceram_real", e.target.value)} className="bg-muted/50 h-9 text-xs" placeholder="0" />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSubmit} disabled={addMutation.isPending || updateMutation.isPending} className="w-full h-9 bg-primary hover:bg-primary/90 gap-1">
              {editingId ? <><Pencil className="h-3.5 w-3.5" /> Atualizar</> : <><Plus className="h-3.5 w-3.5" /> Salvar</>}
            </Button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Data</TableHead>
              <TableHead>Funil</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">MQL</TableHead>
              <TableHead className="text-right">Agendadas</TableHead>
              <TableHead className="text-right">Confirmadas</TableHead>
              <TableHead className="text-right">Compareceram</TableHead>
              <TableHead className="text-center">Maturação</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricas.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma métrica lançada</TableCell></TableRow>
            ) : metricas.map(m => {
              const diff = Math.floor((Date.now() - new Date(m.data).getTime()) / (1000 * 60 * 60 * 24));
              const mat = diff >= 30
                ? { label: "Madura", cls: "text-emerald-400 bg-emerald-400/10" }
                : diff >= 14
                  ? { label: "Em maturação", cls: "text-amber-400 bg-amber-400/10" }
                  : diff >= 7
                    ? { label: "Recente", cls: "text-blue-400 bg-blue-400/10" }
                    : { label: "Nova", cls: "text-muted-foreground bg-muted/20" };
              const pctAgend = m.leads_qualificados > 0 ? (m.reunioes_agendadas / m.leads_qualificados * 100).toFixed(0) + "%" : "–";
              return (
              <TableRow key={m.id} className={`border-border cursor-pointer hover:bg-muted/30 ${editingId === m.id ? "bg-muted/20" : ""}`} onClick={() => handleEdit(m)}>
                <TableCell className="text-sm">{m.data}</TableCell>
                <TableCell className="font-medium text-sm">{m.funil}</TableCell>
                <TableCell className="text-right tabular-nums">{m.leads_recebidos}</TableCell>
                <TableCell className="text-right tabular-nums">{m.leads_qualificados}</TableCell>
                <TableCell className="text-right tabular-nums text-amber-400">{m.reunioes_agendadas}</TableCell>
                <TableCell className="text-right tabular-nums text-amber-400">{m.reunioes_confirmadas}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-400">{m.compareceram_real}</TableCell>
                <TableCell className="text-center">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${mat.cls}`}>{mat.label}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={(e) => { e.stopPropagation(); handleEdit(m); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(m.id, { onSuccess: () => toast.success("Removido") }); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}
