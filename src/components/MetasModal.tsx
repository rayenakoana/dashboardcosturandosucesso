import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { META_TIPOS, ConfigTipo, useConfiguracoes } from "@/hooks/useConfiguracoes";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const metaLabels: Record<string, string> = {
  "Meta Venda Geral": "Meta de Venda Geral (R$)",
  "Meta Renovação": "Meta de Renovação (unidades)",
  "Meta Volume Vendas": "Meta de Volume de Vendas (unidades)",
};

export function MetasModal() {
  const qc = useQueryClient();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const mesRef = `${year}-${String(month + 1).padStart(2, "0")}`;
  const mesLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const { data: allMetas = [], isLoading } = useConfiguracoes();

  // Sync values when month changes or data loads
  useEffect(() => {
    if (!isLoading) {
      const v: Record<string, string> = {};
      META_TIPOS.forEach(tipo => {
        const item = allMetas.find(m => m.tipo === tipo && (m as any).mes_ref === mesRef);
        if (item) v[tipo] = item.valor;
        else v[tipo] = "";
      });
      setValues(v);
    }
  }, [mesRef, allMetas, isLoading]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const tipo of META_TIPOS) {
        const existing = allMetas.find(m => m.tipo === tipo && (m as any).mes_ref === mesRef);
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

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Editar Metas</DialogTitle>
        </DialogHeader>

        {/* Month navigator - no limits */}
        <div className="flex items-center justify-center gap-3 py-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center capitalize">{mesLabel}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3">
          {META_TIPOS.map(tipo => (
            <div key={tipo}>
              <Label className="text-xs text-muted-foreground">{metaLabels[tipo]}</Label>
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

        <Button
          onClick={handleSaveAll}
          disabled={saving}
          size="sm"
          className="w-full bg-primary hover:bg-primary/90 mt-2"
        >
          {saving ? "Salvando..." : "Salvar Metas"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
