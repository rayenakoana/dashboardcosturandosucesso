import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CONFIG_TIPOS, ConfigTipo, useConfiguracoes, useAddConfiguracao, useDeleteConfiguracao } from "@/hooks/useConfiguracoes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState<ConfigTipo>("Funil");
  const [newValue, setNewValue] = useState("");
  const { data: items = [], isLoading } = useConfiguracoes(activeTab);
  const addMutation = useAddConfiguracao();
  const deleteMutation = useDeleteConfiguracao();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie as listas que alimentam os dropdowns do sistema
        </p>
      </div>

      <GlassCard>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ConfigTipo)}>
          <TabsList className="bg-muted/50 mb-6 flex-wrap h-auto gap-1">
            {CONFIG_TIPOS.map(tipo => (
              <TabsTrigger key={tipo} value={tipo} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                {tipo}
              </TabsTrigger>
            ))}
          </TabsList>

          {CONFIG_TIPOS.map(tipo => (
            <TabsContent key={tipo} value={tipo}>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder={`Novo ${tipo.toLowerCase()}...`}
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  className="bg-muted/50 border-border"
                />
                <Button onClick={handleAdd} disabled={addMutation.isPending} className="gap-1">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                      >
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
