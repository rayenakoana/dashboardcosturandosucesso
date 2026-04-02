import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MetricaDiaria {
  id: string;
  data: string;
  funil: string;
  leads_recebidos: number;
  leads_qualificados: number;
  reunioes_agendadas: number;
  reunioes_confirmadas: number;
  compareceram_real: number;
  created_at: string;
}

export function useMetricasDiarias() {
  return useQuery({
    queryKey: ["metricas_diarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metricas_diarias")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as MetricaDiaria[];
    },
  });
}

export function useAddMetricaDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (metrica: Omit<MetricaDiaria, "id" | "created_at">) => {
      const { error } = await supabase.from("metricas_diarias").upsert(metrica, {
        onConflict: "data,funil",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metricas_diarias"] }),
  });
}

export function useUpdateMetricaDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Omit<MetricaDiaria, "id" | "created_at">>) => {
      const { error } = await supabase.from("metricas_diarias").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metricas_diarias"] }),
  });
}

export function useDeleteMetricaDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metricas_diarias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metricas_diarias"] }),
  });
}
