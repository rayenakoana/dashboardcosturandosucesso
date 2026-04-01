import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMetricasDiarias, useAddMetricaDiaria, useDeleteMetricaDiaria } from "@/hooks/useMetricasDiarias";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { sendToWebhook } from "@/hooks/useWebhook";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().split("T")[0];

export default function InputDiario() {
  const { data: metricas = [] } = useMetricasDiarias();
  const addMutation = useAddMetricaDiaria();
  const deleteMutation = useDeleteMetricaDiaria();
  const { data: funis = [] } = useConfiguracoes("Funil");

  const [form, setForm] = useState({
    data: today(),
    funil: "",
    leads_recebidos: "",
    leads_qualificados: "",
    reunioes_agendadas: "",
    reunioes_confirmadas: "",
    compareceram_real: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

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
    addMutation.mutate(payload, {
      onSuccess: () => {
        sendToWebhook("metrica_diaria", payload);
        toast.success("Métricas salvas");
        setForm(f => ({ ...f, leads_recebidos: "", leads_qualificados: "", reunioes_agendadas: "", reunioes_confirmadas: "", compareceram_real: "" }));
      },
      onError: () => toast.error("Erro ao salvar"),
    });
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
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Novo Lançamento</h2>
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
            <Button onClick={handleSubmit} disabled={addMutation.isPending} className="w-full h-9 bg-primary hover:bg-primary/90 gap-1">
              <Plus className="h-3.5 w-3.5" /> Salvar
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
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricas.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma métrica lançada</TableCell></TableRow>
            ) : metricas.map(m => (
              <TableRow key={m.id} className="border-border">
                <TableCell className="text-sm">{m.data}</TableCell>
                <TableCell className="font-medium text-sm">{m.funil}</TableCell>
                <TableCell className="text-right tabular-nums">{m.leads_recebidos}</TableCell>
                <TableCell className="text-right tabular-nums">{m.leads_qualificados}</TableCell>
                <TableCell className="text-right tabular-nums">{m.reunioes_agendadas}</TableCell>
                <TableCell className="text-right tabular-nums">{m.reunioes_confirmadas}</TableCell>
                <TableCell className="text-right tabular-nums">{m.compareceram_real}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(m.id, { onSuccess: () => toast.success("Removido") })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}
