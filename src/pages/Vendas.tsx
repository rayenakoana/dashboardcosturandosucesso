import { useState, useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useVendas, useAddVenda, useUpdateVenda, useDeleteVenda } from "@/hooks/useVendas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { sendToWebhook } from "@/hooks/useWebhook";
import { Plus, Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Search, X, Filter } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["Lead", "MQL", "Reunião", "Fechado", "Perdido"];

const initialForm = {
  nome_cliente: "",
  empresa: "",
  email_cliente: "",
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

type SortKey = "nome_cliente" | "empresa" | "status" | "produto" | "funil" | "responsavel" | "valor" | "data_entrada" | "data_fechamento" | "ciclo";
type SortDir = "asc" | "desc";

const diffDays = (entrada?: string | null, fechamento?: string | null) => {
  if (!entrada || !fechamento) return null;
  const a = new Date(entrada).getTime();
  const b = new Date(fechamento).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
};

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
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

  // Filtros
  const [search, setSearch] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("all");
  const [filtroProdutoFunil, setFiltroProdutoFunil] = useState("all");
  const [filterFunis, setFilterFunis] = useState<string[]>([]);
  const toggleFunilFiltro = (nome: string) => {
    setFilterFunis(prev => prev.includes(nome) ? prev.filter(f => f !== nome) : [...prev, nome]);
  };

  // Ordenação
  const [sortKey, setSortKey] = useState<SortKey>("data_entrada");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const responsaveisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    vendas.forEach(v => v.responsavel && set.add(v.responsavel));
    return Array.from(set).sort();
  }, [vendas]);

  const produtosFunisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach(p => set.add(p.valor));
    funis.forEach(f => set.add(f.valor));
    vendas.forEach(v => {
      if (v.produto) set.add(v.produto);
      if (v.funil) set.add(v.funil);
    });
    return Array.from(set).sort();
  }, [produtos, funis, vendas]);

  const vendasFiltradas = useMemo(() => {
    let result = vendas.filter(v => {
      // Busca global
      if (search.trim()) {
        const q = search.toLowerCase();
        const match = (v.nome_cliente || "").toLowerCase().includes(q) ||
                      (v.empresa || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      // Período: incluir se entrada OU fechamento estiver no range
      if (dateStart || dateEnd) {
        const inRange = (d?: string | null) => {
          if (!d) return false;
          if (dateStart && d < dateStart) return false;
          if (dateEnd && d > dateEnd) return false;
          return true;
        };
        if (!inRange(v.data_entrada) && !inRange(v.data_fechamento)) return false;
      }
      if (filtroResponsavel !== "all" && v.responsavel !== filtroResponsavel) return false;
      if (filtroProdutoFunil !== "all") {
        const f = filtroProdutoFunil.toLowerCase();
        if ((v.produto || "").toLowerCase() !== f && (v.funil || "").toLowerCase() !== f) return false;
      }
      if (filterFunis.length > 0 && !filterFunis.includes(v.funil)) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "ciclo") {
        av = diffDays(a.data_entrada, a.data_fechamento) ?? -1;
        bv = diffDays(b.data_entrada, b.data_fechamento) ?? -1;
      } else if (sortKey === "valor") {
        av = Number(a.valor) || 0;
        bv = Number(b.valor) || 0;
      } else {
        av = (a as any)[sortKey] ?? "";
        bv = (b as any)[sortKey] ?? "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [vendas, search, dateStart, dateEnd, filtroResponsavel, filtroProdutoFunil, filterFunis, sortKey, sortDir]);

  const resumo = useMemo(() => {
    const total = vendasFiltradas.reduce((acc, v) => acc + (Number(v.valor) || 0), 0);
    const fechadas = vendasFiltradas.filter(v => v.status === "Fechado");
    const totalFechado = fechadas.reduce((acc, v) => acc + (Number(v.valor) || 0), 0);
    const ticket = fechadas.length > 0 ? totalFechado / fechadas.length : 0;
    return { qtd: vendasFiltradas.length, qtdFechadas: fechadas.length, total, ticket };
  }, [vendasFiltradas]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const SortableHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-foreground transition-colors">
        {label}<SortIcon k={k} />
      </button>
    </TableHead>
  );

  const limparFiltros = () => {
    setSearch(""); setDateStart(""); setDateEnd("");
    setFiltroResponsavel("all"); setFiltroProdutoFunil("all"); setFilterFunis([]);
  };
  const hasFiltros = !!(search || dateStart || dateEnd || filtroResponsavel !== "all" || filtroProdutoFunil !== "all" || filterFunis.length > 0);
  const painelFiltrosCount = [dateStart, dateEnd, filtroResponsavel !== "all", filtroProdutoFunil !== "all", filterFunis.length > 0].filter(Boolean).length;

  const aplicarPresetPeriodo = (preset: "hoje" | "mes" | "trimestre") => {
    const hoje = new Date();
    const toISO = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === "hoje") {
      setDateStart(toISO(hoje)); setDateEnd(toISO(hoje));
    } else if (preset === "mes") {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      setDateStart(toISO(inicio)); setDateEnd(toISO(hoje));
    } else if (preset === "trimestre") {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
      setDateStart(toISO(inicio)); setDateEnd(toISO(hoje));
    }
  };

  const resetForm = () => {
    setForm({ ...initialForm, data_entrada: new Date().toISOString().split("T")[0] });
    setEditingId(null);
  };

  const handleOpenNew = () => { resetForm(); setOpen(true); };

  const handleEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      nome_cliente: v.nome_cliente || "",
      empresa: v.empresa || "",
      email_cliente: v.email_cliente || "",
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
          setOpen(false); resetForm();
          toast.success("Venda atualizada");
        },
        onError: () => toast.error("Erro ao atualizar venda"),
      });
    } else {
      addMutation.mutate(payload as any, {
        onSuccess: () => {
          sendToWebhook("venda", payload);
          setOpen(false); resetForm();
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
          <p className="text-muted-foreground text-sm mt-1">Cadastro, auditoria e análise de leads e vendas</p>
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
              <div>
                <Label>E-mail do cliente</Label>
                <Input type="email" value={form.email_cliente} onChange={e => set("email_cliente", e.target.value)} className="bg-muted/50" placeholder="email@empresa.com.br" />
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
                <div><Label>Data de Entrada</Label><Input type="date" value={form.data_entrada} onChange={e => set("data_entrada", e.target.value)} className="bg-muted/50" /></div>
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

      {/* Filtros */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <Label className="text-xs text-muted-foreground">Buscar cliente / empresa</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Digite para buscar..." className="bg-muted/50 pl-8" />
            </div>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 bg-muted/50">
                <Filter className="h-4 w-4" /> Filtros
                {painelFiltrosCount > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
                    {painelFiltrosCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-card border-border overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros {painelFiltrosCount > 0 && <span className="text-muted-foreground font-normal">({painelFiltrosCount})</span>}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 mt-6">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Período</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs bg-muted/50" onClick={() => aplicarPresetPeriodo("hoje")}>Hoje</Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs bg-muted/50" onClick={() => aplicarPresetPeriodo("mes")}>Este mês</Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs bg-muted/50" onClick={() => aplicarPresetPeriodo("trimestre")}>Trimestre</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">De</Label>
                      <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-muted/50" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Até</Label>
                      <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-muted/50" />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Funil <span className="text-[11px]">(selecione um ou vários)</span>
                  </Label>
                  <div className="space-y-1.5">
                    {funis.map(f => (
                      <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterFunis.includes(f.valor)}
                          onChange={() => toggleFunilFiltro(f.valor)}
                          className="accent-primary h-3.5 w-3.5"
                        />
                        {f.valor}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Vendedor / SDR</Label>
                  <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
                    <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {responsaveisDisponiveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Produto / Funil</Label>
                  <Select value={filtroProdutoFunil} onValueChange={setFiltroProdutoFunil}>
                    <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {produtosFunisDisponiveis.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SheetFooter className="mt-8 flex-row gap-2 sm:justify-start">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setDateStart(""); setDateEnd(""); setFiltroResponsavel("all"); setFiltroProdutoFunil("all"); }}
                >
                  Limpar filtros
                </Button>
                <SheetClose asChild>
                  <Button className="flex-1 bg-primary hover:bg-primary/90">Aplicar filtros</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {hasFiltros && (
            <Button variant="ghost" onClick={limparFiltros} className="gap-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" /> Limpar tudo
            </Button>
          )}
        </div>

        {/* Resumo */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Itens listados</div>
            <div className="text-lg font-semibold mt-0.5">{resumo.qtd}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Vendas fechadas</div>
            <div className="text-lg font-semibold mt-0.5 text-green-400">{resumo.qtdFechadas}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total no período</div>
            <div className="text-lg font-semibold mt-0.5">R$ {resumo.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Ticket médio (fechadas)</div>
            <div className="text-lg font-semibold mt-0.5">R$ {resumo.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <SortableHead k="nome_cliente" label="Cliente" />
              <SortableHead k="empresa" label="Empresa" className="hidden md:table-cell" />
              <SortableHead k="responsavel" label="Responsável" className="hidden lg:table-cell" />
              <SortableHead k="status" label="Status" />
              <SortableHead k="produto" label="Produto" className="hidden sm:table-cell" />
              <SortableHead k="valor" label="Valor" />
              <SortableHead k="data_entrada" label="Entrada" className="hidden md:table-cell" />
              <SortableHead k="data_fechamento" label="Fechamento" className="hidden md:table-cell" />
              <SortableHead k="ciclo" label="Ciclo (d)" className="hidden lg:table-cell" />
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  {vendas.length === 0 ? "Nenhuma venda cadastrada" : "Nenhum resultado para os filtros aplicados"}
                </TableCell>
              </TableRow>
            ) : vendasFiltradas.map(v => {
              const ciclo = diffDays(v.data_entrada, v.data_fechamento);
              return (
                <TableRow key={v.id} className="border-border cursor-pointer hover:bg-muted/30" onClick={() => handleEdit(v)}>
                  <TableCell className="font-medium">{v.nome_cliente}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">{v.empresa || "—"}</TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">{v.responsavel || "—"}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      v.status === "Fechado" ? "bg-green-500/10 text-green-400" :
                      v.status === "Perdido" ? "bg-red-500/10 text-red-400" :
                      "bg-primary/10 text-primary"
                    }`}>{v.status}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{v.produto || "—"}</TableCell>
                  <TableCell className="font-medium">R$ {Number(v.valor).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-sky-300/80 hidden md:table-cell text-sm">{fmtDate(v.data_entrada)}</TableCell>
                  <TableCell className="text-emerald-400/80 hidden md:table-cell text-sm">{fmtDate(v.data_fechamento)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {ciclo === null ? "—" : `${ciclo}d`}
                  </TableCell>
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
              );
            })}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}
