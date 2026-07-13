import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SDR {
  id: string;
  nome: string;
  foto_url: string | null;
  ativo: boolean;
}

export function useSDRs() {
  return useQuery({
    queryKey: ["sdrs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sdrs")
        .select("id, nome, foto_url, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data as SDR[]) || [];
    },
  });
}
