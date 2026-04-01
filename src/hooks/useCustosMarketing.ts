import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useCustosMarketing() {
  return useQuery({
    queryKey: ["custos_marketing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custos_marketing")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (custo: TablesInsert<"custos_marketing">) => {
      const { error } = await supabase.from("custos_marketing").insert(custo);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custos_marketing"] }),
  });
}

export function useDeleteCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custos_marketing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custos_marketing"] }),
  });
}
