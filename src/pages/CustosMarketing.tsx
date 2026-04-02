import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCustosMarketing, useAddCusto, useUpdateCusto, useDeleteCusto } from "@/hooks/useCustosMarketing";
import { sendToWebhook } from "@/hooks/useWebhook";
import { Plus, Trash2, DollarSign, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = ["Ads", "Software", "Equipe"];

const initialForm = { data: new Date().toISOString().split("T")[0], categoria: "", nome_item: "", produto: "", valor: "" };

export default function CustosMarketing() {
  const { data: custos = [] } = useCustosMarketing();
  const addCusto = useAddCusto();
  const updateCusto = useUpdateCusto();
  const deleteCusto = useDeleteCusto();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [custoForm, setCustoForm] = useState(initialForm);

  const resetForm = () => {
    setCustoForm({ ...initialForm, data: new Date().toISOString().split("T")[0] });
    setEditingId(null);
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setCustoForm({
      data: c.data,
      categoria: c.categoria,
      nome_item: c.nome_item,
      produto: c.produto || "",
      valor: String(c.valor),
    });
  };

  const handleCusto = () => {
    if (!custoForm.categoria || !custoForm.nome_item.trim()) { toast.error("Preencha todos os campos"); return; }
    const payload = { ...custoForm, valor: Number(custoForm.valor) || 0 };

    if (editingId) {
      updateCusto.mutate({ id: editingId, ...payload } as any, {
        onSuccess: () => {
          sendToWebhook("custo_marketing_atualizado", { id: editingId, ...payload });
          toast.success("Custo atualizado");
          resetForm();
        },
        onError: () => toast.error("Erro ao atualizar custo"),
      });
    } else {
      addCusto.mutate(payload, {
        onSuccess: () => {
          sendToWebhook("custo_marketing", payload);
          toast.success("Custo adicionado");
          resetForm();
        },
        onError: () => toast.error("Erro ao adicionar custo"),
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Custos de Marketing</h1>
        <p className="text-muted-foreground text-sm mt-1">Registre gastos com Ads, Software e Equipe</p>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{editingId ? "Editando Gasto" : "Novo Gasto"}</h2>
          </div>
          {editingId && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={resetForm}>
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <div><Label>Data</Label><Input type="date" value={custoForm.data} onChange={e => setCustoForm(f => ({ ...f, data: e.target.value }))} className="bg-muted/50" /></div>
          <div><Label>Categoria</Label>
            <Select value={custoForm.categoria} onValueChange={v => setCustoForm(f => ({ ...f, categoria: v }))}>
              <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Ferramenta / Canal</Label><Input value={custoForm.nome_item} onChange={e => setCustoForm(f => ({ ...f, nome_item: e.target.value }))} placeholder="Ex: Meta Ads, n8n..." className="bg-muted/50" /></div>
          <div><Label>Produto</Label><Input value={custoForm.produto} onChange={e => setCustoForm(f => ({ ...f, produto: e.target.value }))} placeholder="Ex: Mentoria, Curso..." className="bg-muted/50" /></div>
          <div><Label>Valor (R$)</Label><Input type="number" value={custoForm.valor} onChange={e => setCustoForm(f => ({ ...f, valor: e.target.value }))} className="bg-muted/50" placeholder="0,00" /></div>
          <div className="flex items-end">
            <Button onClick={handleCusto} disabled={addCusto.isPending || updateCusto.isPending} className="w-full gap-1 bg-primary hover:bg-primary/90">
              {editingId ? <><Pencil className="h-4 w-4" /> Atualizar</> : <><Plus className="h-4 w-4" /> Salvar</>}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Ferramenta / Canal</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custos.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum custo cadastrado</TableCell></TableRow>
              ) : custos.map(c => (
                <TableRow key={c.id} className={`border-border cursor-pointer hover:bg-muted/30 ${editingId === c.id ? "bg-muted/20" : ""}`} onClick={() => handleEdit(c)}>
                  <TableCell className="text-muted-foreground">{c.data}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c.categoria}</span></TableCell>
                  <TableCell className="font-medium">{c.nome_item}</TableCell>
                  <TableCell>R$ {Number(c.valor).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); handleEdit(c); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteCusto.mutate(c.id, { onSuccess: () => toast.success("Removido"), onError: () => toast.error("Erro ao remover") }); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}
