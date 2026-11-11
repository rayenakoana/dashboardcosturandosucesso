import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RdCatalogoTipo = "Funil" | "Campanha" | "Origem" | "Produto" | "Segmento";

export interface RdCatalogoItem {
  id: string;
  rd_id: string;
  tipo: string;
  valor: string;
  valor_canonico: string | null;
  ativo: boolean;
}

export function useRdCatalogo(tipo: RdCatalogoTipo) {
  return useQuery({
    queryKey: ["rd_catalogos", tipo],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rd_catalogos")
        .select("id, rd_id, tipo, valor, valor_canonico, ativo")
        .eq("tipo", tipo)
        .eq("ativo", true)
        .order("valor");
      if (error) throw error;
      return (data ?? []) as RdCatalogoItem[];
    },
  });
}
