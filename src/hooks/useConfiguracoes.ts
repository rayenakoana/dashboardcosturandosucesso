import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FUNIS_ORDEM_CANONICA } from "@/lib/funis";

export type ConfigTipo = "Funil" | "Produto" | "Campanha" | "Origem" | "Segmento" | "Motivo de Perda" | "Meta Venda Geral" | "Meta Renovação" | "Meta Volume Vendas";

export const CONFIG_TIPOS: ConfigTipo[] = [
  "Funil", "Produto", "Campanha", "Origem", "Segmento", "Motivo de Perda"
];

export const META_TIPOS: ConfigTipo[] = [
  "Meta Venda Geral", "Meta Renovação", "Meta Volume Vendas"
];

export function useConfiguracoes(tipo?: ConfigTipo) {
  return useQuery({
    queryKey: ["configuracoes", tipo],
    queryFn: async () => {
      let q = supabase.from("configuracoes").select("*").order("valor");
      if (tipo) q = q.eq("tipo", tipo);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useAddConfiguracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tipo, valor }: { tipo: string; valor: string }) => {
      const { error } = await supabase.from("configuracoes").insert({ tipo, valor });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["configuracoes"] }),
  });
}

export function useDeleteConfiguracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("configuracoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["configuracoes"] }),
  });
}

export function useUpdateConfiguracaoVisibilidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, visivel }: { id: string; visivel: boolean }) => {
      const { error } = await supabase.from("configuracoes").update({ visivel }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["configuracoes"] }),
  });
}

// Lista de funis marcados como visíveis (tipo "Funil", visivel != false), já na ordem canônica.
// Usar este hook em vez de arrays hardcoded, para que o toggle em Configurações reflita em todo o app.
export function useFunisVisiveis() {
  const { data: funis = [], isLoading } = useConfiguracoes("Funil");
  const nomesVisiveis = funis
    .filter((f: any) => f.visivel !== false)
    .map((f: any) => f.valor as string);
  const ordenados = FUNIS_ORDEM_CANONICA.filter(f => nomesVisiveis.includes(f));
  const extras = nomesVisiveis.filter(f => !FUNIS_ORDEM_CANONICA.includes(f));
  return { funisVisiveis: [...ordenados, ...extras], isLoading };
}
