import { useState, useEffect, useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Target, Save } from "lucide-react";
import { META_TIPOS, ConfigTipo, useConfiguracoes } from "@/hooks/useConfiguracoes";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const metaLabels: Record<string, string> = {
  "Meta Venda Geral": "Meta de Venda Geral (R$)",
  "Meta Renovação": "Meta de Renovação (unidades)",
  "Meta Volume Vendas": "Meta de Volume de Vendas (unidades)",
};

export default function Metas() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
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

  // Build history table from saved metas
  const historyData = useMemo(() => {
    const metasByMonth: Record<string, Record<string, string>> = {};
    allMetas
      .filter(m => META_TIPOS.includes(m.tipo as ConfigTipo) && (m as any).mes_ref)
      .forEach(m => {
        const mr = (m as any).mes_ref as string;
        if (!metasByMonth[mr]) metasByMonth[mr] = {};
        metasByMonth[mr][m.tipo] = m.valor;
      });
    return Object.entries(metasByMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mes, vals]) => {
        const d = new Date(Number(mes.split("-")[0]), Number(mes.split("-")[1]) - 1, 1);
        const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        return {
          mes,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          vendaGeral: vals["Meta Venda Geral"] || "—",
          renovacao: vals["Meta Renovação"] || "—",
          volume: vals["Meta Volume Vendas"] || "—",
        };
      });
  }, [allMetas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Metas</h1>
        <p className="text-muted-foreground text-sm mt-1">Defina e acompanhe suas metas mensais de vendas</p>
      </div>

      <GlassCard>
        {/* Month navigator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <p className="text-lg font-semibold capitalize">{mesLabel}</p>
            <p className="text-xs text-muted-foreground">Referência: {mesRef}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {META_TIPOS.map(tipo => (
            <div key={tipo} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{metaLabels[tipo]}</Label>
              <Input
                type="number"
                value={values[tipo] || ""}
                onChange={e => setValues(prev => ({ ...prev, [tipo]: e.target.value }))}
                placeholder="0"
                className="bg-muted/50 border-border h-10"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-5">
          <Button onClick={handleSaveAll} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Metas"}
          </Button>
        </div>
      </GlassCard>

      {/* History */}
      <GlassCard>
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Histórico de Metas
        </h3>
        {historyData.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma meta salva ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-xs">Período</TableHead>
                  <TableHead className="text-xs text-right">Venda Geral (R$)</TableHead>
                  <TableHead className="text-xs text-right">Renovação (un.)</TableHead>
                  <TableHead className="text-xs text-right">Volume (un.)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.map(row => (
                  <TableRow key={row.mes} className="border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      const [y, m] = row.mes.split("-");
                      setYear(Number(y));
                      setMonth(Number(m) - 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <TableCell className="text-sm font-medium">{row.label}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{row.vendaGeral !== "—" ? `R$ ${Number(row.vendaGeral).toLocaleString("pt-BR")}` : "—"}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{row.renovacao}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{row.volume}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
