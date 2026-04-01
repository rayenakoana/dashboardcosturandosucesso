import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConfigTipo = "Funil" | "Produto" | "Campanha" | "Origem" | "Segmento" | "Motivo de Perda";

export const CONFIG_TIPOS: ConfigTipo[] = [
  "Funil", "Produto", "Campanha", "Origem", "Segmento", "Motivo de Perda"
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
