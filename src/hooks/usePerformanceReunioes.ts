import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export function usePerformanceReunioes() {
  return useQuery({
    queryKey: ["performance_reunioes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_reunioes")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddReuniao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reuniao: TablesInsert<"performance_reunioes">) => {
      const { error } = await supabase.from("performance_reunioes").insert(reuniao);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance_reunioes"] }),
  });
}

export function useDeleteReuniao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("performance_reunioes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance_reunioes"] }),
  });
}
