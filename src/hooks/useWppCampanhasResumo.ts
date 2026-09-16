import { useQuery } from "@tanstack/react-query";
import { supabaseWpp } from "@/integrations/supabase/wppClient";

export interface WppCampanhaResumo {
  id: string;
  name: string;
  status: string;
  created_at: string;
  total_envios: number;
  entregues: number;
  lidos: number;
  falhas: number;
}

export interface WppTotais {
  campanhas: number;
  enviadas: number;
  entregues: number;
  lidas: number;
  falhas: number;
  taxaEntrega: number;
  taxaLeitura: number;
}

export function useWppCampanhasResumo(from: string, to: string) {
  return useQuery({
    queryKey: ["wpp_campanhas_resumo", from, to],
    queryFn: async () => {
      // Campanhas do período
      const { data: campanhas, error: errCamp } = await supabaseWpp
        .from("campaigns")
        .select("id, name, status, created_at")
        .gte("created_at", from)
        .lte("created_at", to + "T23:59:59")
        .order("created_at", { ascending: false })
        .limit(50);

      if (errCamp) throw errCamp;

      const lista = campanhas ?? [];
      const ids = lista.map((c: any) => c.id);

      let envios: any[] = [];
      if (ids.length > 0) {
        const { data: enviosData, error: errEnv } = await supabaseWpp
          .from("campaign_sends")
          .select("campaign_id, status, sent_at, created_at")
          .in("campaign_id", ids);
        if (errEnv) throw errEnv;
        envios = enviosData ?? [];
      }

      // Agrupa envios por campanha
      const porCampanha: Record<string, any[]> = {};
      for (const e of envios) {
        if (!porCampanha[e.campaign_id]) porCampanha[e.campaign_id] = [];
        porCampanha[e.campaign_id].push(e);
      }

      const campanhasResumo: WppCampanhaResumo[] = lista.map((c: any) => {
        const envs = porCampanha[c.id] ?? [];
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          created_at: c.created_at,
          total_envios: envs.filter((e) => ["sent", "delivered", "read"].includes(e.status)).length,
          entregues: envs.filter((e) => ["delivered", "read"].includes(e.status)).length,
          lidos: envs.filter((e) => e.status === "read").length,
          falhas: envs.filter((e) => e.status === "failed").length,
        };
      });

      // Totais consolidados
      const totais: WppTotais = campanhasResumo.reduce(
        (acc, c) => ({
          campanhas: acc.campanhas + 1,
          enviadas: acc.enviadas + c.total_envios,
          entregues: acc.entregues + c.entregues,
          lidas: acc.lidas + c.lidos,
          falhas: acc.falhas + c.falhas,
          taxaEntrega: 0,
          taxaLeitura: 0,
        }),
        { campanhas: 0, enviadas: 0, entregues: 0, lidas: 0, falhas: 0, taxaEntrega: 0, taxaLeitura: 0 }
      );
      totais.taxaEntrega = totais.enviadas > 0 ? (totais.entregues / totais.enviadas) * 100 : 0;
      totais.taxaLeitura = totais.entregues > 0 ? (totais.lidas / totais.entregues) * 100 : 0;

      return { campanhas: campanhasResumo, totais };
    },
    staleTime: 1000 * 60 * 5,
  });
}
