import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useVendas() {
  return useQuery({
    queryKey: ["vendas"],
    queryFn: async () => {
      const pageSize = 1000;
      let allRows: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("vendas")
          .select("*")
          .order("data_entrada", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allRows = allRows.concat(data ?? []);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allRows;
    },
  });
}

export function useAddVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (venda: TablesInsert<"vendas">) => {
      const { error } = await supabase.from("vendas").insert(venda);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendas"] }),
  });
}

export function useUpdateVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<TablesInsert<"vendas">>) => {
      const { error } = await supabase.from("vendas").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendas"] }),
  });
}

export function useDeleteVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendas"] }),
  });
}
