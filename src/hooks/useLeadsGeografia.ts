import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadGeografiaRow {
  deal_id: string;
  pipeline_id: string | null;
  pais: string | null;
  uf: string | null;
  estado: string | null;
  regiao: string | null;
  cidade: string | null;
  estado_organizacao: string | null;
  rating: number | null;
  created_at: string;
}

const PAGE_SIZE = 1000;

export function useLeadsGeografia() {
  return useQuery({
    queryKey: ["leads_geografia_all"],
    queryFn: async (): Promise<LeadGeografiaRow[]> => {
      let all: LeadGeografiaRow[] = [];
      let from = 0;
      // Paginação necessária: PostgREST trunca em 1000 linhas por padrão
      while (true) {
        const { data, error } = await supabase
          .from("leads_geografia")
          .select("deal_id, pipeline_id, pais, uf, estado, regiao, cidade, estado_organizacao, rating, created_at")
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data as unknown as LeadGeografiaRow[]);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
  });
}
