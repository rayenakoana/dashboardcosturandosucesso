import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useVendas, useAddVenda, useDeleteVenda } from "@/hooks/useVendas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { sendToWebhook } from "@/hooks/useWebhook";
import { Plus, Trash2 } from "lucide-react";
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
  const deleteMutation = useDeleteVenda();
  const { data: funis = [] } = useConfiguracoes("Funil");
  const { data: produtos = [] } = useConfiguracoes("Produto");
  const { data: campanhas = [] } = useConfiguracoes("Campanha");
  const { data: origens = [] } = useConfiguracoes("Origem");
  const { data: segmentos = [] } = useConfiguracoes("Segmento");
  const { data: motivos = [] } = useConfiguracoes("Motivo de Perda");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const handleSubmit = () => {
    if (!form.nome_cliente.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    const payload = {
      ...form,
      valor: Number(form.valor) || 0,
      data_fechamento: form.data_fechamento || null,
      motivo_perda: form.status === "Perdido" ? form.motivo_perda : null,
    };
    addMutation.mutate(payload as any, {
      onSuccess: () => {
        sendToWebhook("venda", payload);
        setOpen(false);
        setForm({ ...initialForm, data_entrada: new Date().toISOString().split("T")[0] });
        toast.success("Venda adicionada");
      },
    });
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lançamento Comercial</h1>
          <p className="text-muted-foreground text-sm mt-1">Cadastro de leads e vendas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="h-4 w-4" /> Nova Venda</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Venda</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              {/* Texto */}
              <div>
                <Label>Cliente *</Label>
                <Input value={form.nome_cliente} onChange={e => set("nome_cliente", e.target.value)} className="bg-muted/50" placeholder="Nome do cliente" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Empresa</Label>
                  <Input value={form.empresa} onChange={e => set("empresa", e.target.value)} className="bg-muted/50" placeholder="Nome da empresa" />
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Input value={form.responsavel} onChange={e => set("responsavel", e.target.value)} className="bg-muted/50" placeholder="Responsável" />
                </div>
              </div>

              {/* Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Segmento</Label>
                  <Select value={form.segmento} onValueChange={v => set("segmento", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{segmentos.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Produto</Label>
                  <Select value={form.produto} onValueChange={v => set("produto", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{produtos.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Funil</Label>
                  <Select value={form.funil} onValueChange={v => set("funil", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{funis.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fonte / Origem</Label>
                  <Select value={form.origem} onValueChange={v => set("origem", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{origens.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Campanha</Label>
                  <Select value={form.campanha} onValueChange={v => set("campanha", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{campanhas.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor Total (R$)</Label>
                  <Input type="number" value={form.valor} onChange={e => set("valor", e.target.value)} className="bg-muted/50" placeholder="0,00" />
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de Chegada</Label>
                  <Input type="date" value={form.data_entrada} onChange={e => set("data_entrada", e.target.value)} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Data de Fechamento</Label>
                  <Input type="date" value={form.data_fechamento} onChange={e => set("data_fechamento", e.target.value)} className="bg-muted/50" />
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.status === "Perdido" && (
                  <div>
                    <Label>Motivo Perda</Label>
                    <Select value={form.motivo_perda} onValueChange={v => set("motivo_perda", v)}>
                      <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{motivos.map(s => <SelectItem key={s.id} value={s.valor}>{s.valor}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-3 py-1">
                <Switch checked={form.is_renovacao} onCheckedChange={v => set("is_renovacao", v)} />
                <Label className="cursor-pointer">É uma Renovação?</Label>
              </div>

              <Button onClick={handleSubmit} disabled={addMutation.isPending} className="w-full mt-2">
                Salvar Venda
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Cliente</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma venda cadastrada
                </TableCell>
              </TableRow>
            ) : vendas.map(v => (
              <TableRow key={v.id} className="border-border">
                <TableCell className="font-medium">{v.nome_cliente}</TableCell>
                <TableCell className="text-muted-foreground">{(v as any).empresa || "—"}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    v.status === "Fechado" ? "bg-green-500/10 text-green-400" :
                    v.status === "Perdido" ? "bg-red-500/10 text-red-400" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {v.status}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{v.produto || "—"}</TableCell>
                <TableCell>R$ {Number(v.valor).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-muted-foreground">{v.data_entrada}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(v.id, { onSuccess: () => toast.success("Removida") })}>
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
