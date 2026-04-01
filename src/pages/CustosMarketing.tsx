import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCustosMarketing, useAddCusto, useDeleteCusto } from "@/hooks/useCustosMarketing";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = ["Ads", "Software", "Equipe"];

export default function CustosMarketing() {
  const { data: custos = [] } = useCustosMarketing();
  const addMutation = useAddCusto();
  const deleteMutation = useDeleteCusto();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ data: new Date().toISOString().split("T")[0], categoria: "", nome_item: "", valor: "" });

  const handleSubmit = () => {
    if (!form.categoria || !form.nome_item.trim()) { toast.error("Preencha todos os campos"); return; }
    addMutation.mutate({ ...form, valor: Number(form.valor) || 0 }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ data: new Date().toISOString().split("T")[0], categoria: "", nome_item: "", valor: "" });
        toast.success("Custo adicionado");
      },
    });
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custos Marketing</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de gastos por categoria</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="h-4 w-4" /> Novo Custo</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Novo Custo</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={e => set("data", e.target.value)} className="bg-muted/50" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => set("categoria", v)}>
                  <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome do Item</Label>
                <Input value={form.nome_item} onChange={e => set("nome_item", e.target.value)} placeholder="Ex: Meta Ads, n8n..." className="bg-muted/50" />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" value={form.valor} onChange={e => set("valor", e.target.value)} className="bg-muted/50" />
              </div>
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
              <TableHead>Categoria</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {custos.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum custo cadastrado</TableCell></TableRow>
            ) : custos.map(c => (
              <TableRow key={c.id} className="border-border">
                <TableCell className="text-muted-foreground">{c.data}</TableCell>
                <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c.categoria}</span></TableCell>
                <TableCell className="font-medium">{c.nome_item}</TableCell>
                <TableCell>R$ {Number(c.valor).toLocaleString("pt-BR")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(c.id, { onSuccess: () => toast.success("Removido") })}>
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
