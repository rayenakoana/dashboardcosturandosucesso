import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePerformanceReunioes, useAddReuniao, useDeleteReuniao } from "@/hooks/usePerformanceReunioes";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Reunioes() {
  const { data: reunioes = [] } = usePerformanceReunioes();
  const addMutation = useAddReuniao();
  const deleteMutation = useDeleteReuniao();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ data: new Date().toISOString().split("T")[0], sdr_estimado: "", sdr_confirmado: "", compareceram_real: "" });

  const handleSubmit = () => {
    addMutation.mutate({
      ...form,
      sdr_estimado: Number(form.sdr_estimado) || 0,
      sdr_confirmado: Number(form.sdr_confirmado) || 0,
      compareceram_real: Number(form.compareceram_real) || 0,
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ data: new Date().toISOString().split("T")[0], sdr_estimado: "", sdr_confirmado: "", compareceram_real: "" });
        toast.success("Reunião adicionada");
      },
    });
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Reuniões</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhamento de SDRs e comparecimento</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="h-4 w-4" /> Nova Reunião</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Nova Reunião</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => set("data", e.target.value)} className="bg-muted/50" /></div>
              <div><Label>SDR Estimado</Label><Input type="number" value={form.sdr_estimado} onChange={e => set("sdr_estimado", e.target.value)} className="bg-muted/50" /></div>
              <div><Label>SDR Confirmado</Label><Input type="number" value={form.sdr_confirmado} onChange={e => set("sdr_confirmado", e.target.value)} className="bg-muted/50" /></div>
              <div><Label>Compareceram (Real)</Label><Input type="number" value={form.compareceram_real} onChange={e => set("compareceram_real", e.target.value)} className="bg-muted/50" /></div>
              <Button onClick={handleSubmit} disabled={addMutation.isPending} className="w-full mt-2">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Data</TableHead>
              <TableHead>Estimado</TableHead>
              <TableHead>Confirmado</TableHead>
              <TableHead>Compareceram</TableHead>
              <TableHead>Taxa</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reunioes.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma reunião cadastrada</TableCell></TableRow>
            ) : reunioes.map(r => {
              const taxa = r.sdr_confirmado > 0 ? ((r.compareceram_real / r.sdr_confirmado) * 100).toFixed(0) : "0";
              return (
                <TableRow key={r.id} className="border-border">
                  <TableCell className="text-muted-foreground">{r.data}</TableCell>
                  <TableCell>{r.sdr_estimado}</TableCell>
                  <TableCell>{r.sdr_confirmado}</TableCell>
                  <TableCell className="font-medium">{r.compareceram_real}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{taxa}%</span></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(r.id, { onSuccess: () => toast.success("Removida") })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
