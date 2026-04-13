import { useState, useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CONFIG_TIPOS, META_TIPOS, ConfigTipo, useConfiguracoes, useAddConfiguracao, useDeleteConfiguracao } from "@/hooks/useConfiguracoes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWebhookUrl } from "@/hooks/useWebhook";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, Link, Download, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function MetasSection() {
  const qc = useQueryClient();
  const now = new Date();
  const [mesRef, setMesRef] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [saving, setSaving] = useState(false);

  const metaLabels: Record<string, string> = {
    "Meta Venda Geral": "Meta de Venda Geral (R$)",
    "Meta Renovação": "Meta de Renovação (unidades)",
    "Meta Volume Vendas": "Meta de Volume de Vendas (unidades)",
  };

  // Local state for all 3 metas
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const { data: allMetas = [], isLoading } = useConfiguracoes();

  // Filter metas for the selected month
  const metasDoMes = allMetas.filter(m => META_TIPOS.includes(m.tipo as ConfigTipo) && (m.mes_ref === mesRef || (!m.mes_ref && mesRef === "")));

  if (!initialized && !isLoading && allMetas.length > 0) {
    const v: Record<string, string> = {};
    META_TIPOS.forEach(tipo => {
      const item = allMetas.find(m => m.tipo === tipo && m.mes_ref === mesRef);
      if (item) v[tipo] = item.valor;
    });
    setValues(v);
    setInitialized(true);
  }

  // Reload values when mesRef changes
  const handleMesChange = (newMes: string) => {
    setMesRef(newMes);
    const v: Record<string, string> = {};
    META_TIPOS.forEach(tipo => {
      const item = allMetas.find(m => m.tipo === tipo && m.mes_ref === newMes);
      if (item) v[tipo] = item.valor;
      else v[tipo] = "";
    });
    setValues(v);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const tipo of META_TIPOS) {
        const existing = allMetas.find(m => m.tipo === tipo && m.mes_ref === mesRef);
        if (existing) {
          await supabase.from("configuracoes").delete().eq("id", existing.id);
        }
        const val = (values[tipo] || "").trim();
        if (val) {
          await supabase.from("configuracoes").insert({ tipo, valor: val, mes_ref: mesRef });
        }
      }
      qc.invalidateQueries({ queryKey: ["configuracoes"] });
      toast.success("Metas atualizadas");
    } catch {
      toast.error("Erro ao salvar metas");
    } finally {
      setSaving(false);
    }
  };

  // Generate month options (last 12 months + next 6)
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = -12; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      opts.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return opts;
  }, []);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Metas de Vendas
        </h3>
        <div className="flex items-center gap-3">
          <Select value={mesRef} onValueChange={handleMesChange}>
            <SelectTrigger className="bg-muted/50 border-border h-8 text-xs w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {META_TIPOS.map(tipo => (
          <div key={tipo}>
            <Label className="text-xs text-muted-foreground">{metaLabels[tipo] || tipo}</Label>
            <Input
              type="number"
              value={values[tipo] || ""}
              onChange={e => setValues(prev => ({ ...prev, [tipo]: e.target.value }))}
              placeholder="0"
              className="bg-muted/50 border-border mt-1 h-9"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={handleSaveAll} disabled={saving} size="sm" variant="outline" className="gap-1 text-xs border-border hover:bg-muted/50">
          <Target className="h-3.5 w-3.5" /> Atualizar Metas
        </Button>
      </div>
    </GlassCard>
  );
}

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState<ConfigTipo>("Funil");
  const [newValue, setNewValue] = useState("");
  const { data: items = [], isLoading } = useConfiguracoes(activeTab);
  const addMutation = useAddConfiguracao();
  const deleteMutation = useDeleteConfiguracao();
  const { url: webhookUrl, save: saveWebhook } = useWebhookUrl();
  const [webhookInput, setWebhookInput] = useState(webhookUrl);

  const [importOpen, setImportOpen] = useState(false);
  const [importTipo, setImportTipo] = useState<ConfigTipo>("Funil");
  const [importText, setImportText] = useState("");

  const handleAdd = () => {
    const v = newValue.trim();
    if (!v) return;
    if (items.some(i => i.valor.toLowerCase() === v.toLowerCase())) {
      toast.error("Item já existe");
      return;
    }
    addMutation.mutate({ tipo: activeTab, valor: v }, {
      onSuccess: () => { setNewValue(""); toast.success("Item adicionado"); },
      onError: () => toast.error("Erro ao adicionar"),
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Item removido"),
      onError: () => toast.error("Erro ao remover"),
    });
  };

  const handleBulkImport = async () => {
    const lines = importText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("Nenhum item para importar"); return; }
    let count = 0;
    for (const valor of lines) {
      try {
        await addMutation.mutateAsync({ tipo: importTipo, valor });
        count++;
      } catch { /* skip duplicates */ }
    }
    toast.success(`${count} itens importados para ${importTipo}`);
    setImportText("");
    setImportOpen(false);
  };

  const handleSaveWebhook = () => {
    saveWebhook(webhookInput.trim());
    toast.success("URL do Webhook salva");
  };

  const handleExportCSV = async () => {
    try {
      const { data, error } = await supabase.from("vendas").select("*").order("data_entrada", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) { toast.error("Nenhum dado para exportar"); return; }

      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(","),
        ...data.map(row => headers.map(h => {
          const val = (row as any)[h];
          const str = val === null || val === undefined ? "" : String(val);
          return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cs-dash-vendas-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado com sucesso");
    } catch {
      toast.error("Erro ao exportar dados");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as listas que alimentam os dropdowns do sistema</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-1 border-border" onClick={handleExportCSV}>
            <Download className="h-4 w-4" /> Exportar Base (CSV)
          </Button>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1 border-border">
                <Upload className="h-4 w-4" /> Importar Opções
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle>Importar Opções em Massa</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Cole a lista da sua planilha (um item por linha) e selecione a categoria.</p>
              <div className="grid gap-3 py-2">
                <div>
                  <Label>Categoria</Label>
                  <Tabs value={importTipo} onValueChange={v => setImportTipo(v as ConfigTipo)}>
                    <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
                      {CONFIG_TIPOS.map(t => (
                        <TabsTrigger key={t} value={t} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">{t}</TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                <div>
                  <Label>Itens (um por linha)</Label>
                  <Textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder={"Item 1\nItem 2\nItem 3"} className="bg-muted/50 border-border min-h-[150px] font-mono text-sm" />
                </div>
                <Button onClick={handleBulkImport} disabled={addMutation.isPending} className="w-full bg-primary hover:bg-primary/90">
                  Importar {importText.split("\n").filter(l => l.trim()).length} itens
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Link className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Webhook (Saída de Dados)</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Toda vez que salvar um formulário, o app enviará um JSON para esta URL (n8n, Make, etc.)</p>
        <div className="flex gap-2 flex-col sm:flex-row">
          <Input value={webhookInput} onChange={e => setWebhookInput(e.target.value)} placeholder="https://hooks.n8n.cloud/webhook/..." className="bg-muted/50 border-border font-mono text-xs" />
          <Button onClick={handleSaveWebhook} className="shrink-0 bg-primary hover:bg-primary/90">Salvar</Button>
        </div>
      </GlassCard>

      {/* Metas de Vendas */}
      <MetasSection />

      <GlassCard>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ConfigTipo)}>
          <TabsList className="bg-muted/50 mb-6 flex-wrap h-auto gap-1">
            {CONFIG_TIPOS.map(tipo => (
              <TabsTrigger key={tipo} value={tipo} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">{tipo}</TabsTrigger>
            ))}
          </TabsList>
          {CONFIG_TIPOS.map(tipo => (
            <TabsContent key={tipo} value={tipo}>
              <div className="flex gap-2 mb-4">
                <Input placeholder={`Novo ${tipo.toLowerCase()}...`} value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} className="bg-muted/50 border-border" />
                <Button onClick={handleAdd} disabled={addMutation.isPending} className="gap-1 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : items.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum item cadastrado</p>
              ) : (
                <div className="space-y-1.5">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                      <span className="text-sm">{item.valor}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </GlassCard>
    </div>
  );
}
