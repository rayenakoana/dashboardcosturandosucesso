import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useVendas, useAddVenda, useUpdateVenda, useDeleteVenda } from "@/hooks/useVendas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { sendToWebhook } from "@/hooks/useWebhook";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["Lead", "MQL", "Reunião", "Fechado", "Perdido"];

const initialForm = {
  nome_cliente: "",
  empresa: "",
  responsavel: "",
  segmento: "",
  produto: "",
  funil: "",
  origem: "",
  campanha: "",
  valor: "",
  status: "Lead",
  motivo_perda: "",
  is_renovacao: false,
  data_entrada: new Date().toISOString().split("T")[0],
  data_fechamento: "",
};

export default function Vendas() {
  const { data: vendas = [] } = useVendas();
  const addMutation = useAddVenda();
  const updateMutation = useUpdateVenda();
  const deleteMutation = useDeleteVenda();
  const { data: funis = [] } = useConfiguracoes("Funil");
  const { data: produtos = [] } = useConfiguracoes("Produto");
  const { data: campanhas = [] } = useConfiguracoes("Campanha");
  const { data: origens = [] } = useConfiguracoes("Origem");
  const { data: segmentos = [] } = useConfiguracoes("Segmento");
  const { data: motivos = [] } = useConfiguracoes("Motivo de Perda");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const resetForm = () => {
    setForm({ ...initialForm, data_entrada: new Date().toISOString().split("T")[0] });
    setEditingId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setOpen(true);
  };

  const handleEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      nome_cliente: v.nome_cliente || "",
      empresa: v.empresa || "",
      responsavel: v.responsavel || "",
      segmento: v.segmento || "",
      produto: v.produto || "",
      funil: v.funil || "",
      origem: v.origem || "",
      campanha: v.campanha || "",
      valor: String(v.valor || ""),
      status: v.status || "Lead",
      motivo_perda: v.motivo_perda || "",
      is_renovacao: v.is_renovacao || false,
      data_entrada: v.data_entrada || "",
      data_fechamento: v.data_fechamento || "",
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.nome_cliente.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    const payload = {
      ...form,
      valor: Number(form.valor) || 0,
      data_fechamento: form.data_fechamento || null,
      motivo_perda: form.status === "Perdido" ? form.motivo_perda : null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any, {
        onSuccess: () => {
          sendToWebhook("venda_atualizada", { id: editingId, ...payload });
          setOpen(false);
          resetForm();
          toast.success("Venda atualizada");
        },
        onError: () => toast.error("Erro ao atualizar venda"),
      });
    } else {
      addMutation.mutate(payload as any, {
        onSuccess: () => {
          sendToWebhook("venda", payload);
          setOpen(false);
          resetForm();
          toast.success("Venda adicionada");
        },
        onError: () => toast.error("Erro ao adicionar venda"),
      });
    }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lançamento Comercial</h1>
          <p className="text-muted-foreground text-sm mt-1">Cadastro de leads e vendas</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1 bg-primary hover:bg-primary/90" onClick={handleOpenNew}>
              <Plus className="h-4 w-4" /> Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Venda" : "Nova Venda"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Cliente *</Label>
                <Input value={form.nome_cliente} onChange={e => set("nome_cliente", e.target.value)} className="bg-muted/50" placeholder="Nome do cliente" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Empresa</Label><Input value={form.empresa} onChange={e => set("empresa", e.target.value)} className="bg-muted/50" placeholder="Nome da empresa" /></div>
                <div><Label>Responsável</Label><Input value={form.responsavel} onChange={e => set("responsavel", e.target.value)} className="bg-muted/50" placeholder="Responsável" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Segmento</Label>
                  <Select value={form.segmento} onValueChange={v => set("segmento", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{segmentos.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Produto</Label>
                  <Select value={form.produto} onValueChange={v => set("produto", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{produtos.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Funil</Label>
                  <Select value={form.funil} onValueChange={v => set("funil", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{funis.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Fonte / Origem</Label>
                  <Select value={form.origem} onValueChange={v => set("origem", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{origens.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Campanha</Label>
                  <Select value={form.campanha} onValueChange={v => set("campanha", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{campanhas.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Valor Total (R$)</Label>
                  <Input type="number" value={form.valor} onChange={e => set("valor", e.target.value)} className="bg-muted/50" placeholder="0,00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data de Chegada</Label><Input type="date" value={form.data_entrada} onChange={e => set("data_entrada", e.target.value)} className="bg-muted/50" /></div>
                <div><Label>Data de Fechamento</Label><Input type="date" value={form.data_fechamento} onChange={e => set("data_fechamento", e.target.value)} className="bg-muted/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.status === "Perdido" && (
                  <div><Label>Motivo Perda</Label>
                    <Select value={form.motivo_perda} onValueChange={v => set("motivo_perda", v)}>
                      <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{motivos.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 py-1">
                <Switch checked={form.is_renovacao} onCheckedChange={v => set("is_renovacao", v)} />
                <Label className="cursor-pointer">É uma Renovação?</Label>
              </div>
              <Button onClick={handleSubmit} disabled={addMutation.isPending || updateMutation.isPending} className="w-full mt-2 bg-primary hover:bg-primary/90">
                {editingId ? "Salvar Alterações" : "Salvar Venda"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard className="p-0 overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Produto</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="hidden lg:table-cell">Entrada</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma venda cadastrada</TableCell>
              </TableRow>
            ) : vendas.map(v => (
              <TableRow key={v.id} className="border-border cursor-pointer hover:bg-muted/30" onClick={() => handleEdit(v)}>
                <TableCell className="font-medium">{v.nome_cliente}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">{v.empresa || "—"}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    v.status === "Fechado" ? "bg-green-500/10 text-green-400" :
                    v.status === "Perdido" ? "bg-red-500/10 text-red-400" :
                    "bg-primary/10 text-primary"
                  }`}>{v.status}</span>
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">{v.produto || "—"}</TableCell>
                <TableCell>R$ {Number(v.valor).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">{v.data_entrada}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={(e) => { e.stopPropagation(); handleEdit(v); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(v.id, { onSuccess: () => toast.success("Removida"), onError: () => toast.error("Erro ao remover") }); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}
