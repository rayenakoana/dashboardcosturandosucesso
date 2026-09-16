import { useQuery } from "@tanstack/react-query";
import { supabaseWpp } from "@/integrations/supabase/wppClient";

export interface MetaAdsInsight {
  id: string;
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  date_stop: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  purchases: number;
  purchase_value: number;
  cpl: number;
  roas: number;
  reach: number | null;
  synced_at: string;
}

export function useMetaAdsInsights(from: string, to: string) {
  return useQuery({
    queryKey: ["meta_ads_insights", from, to],
    queryFn: async () => {
      // Busca pelo período. Se vier vazio, pega os últimos registros únicos por campanha.
      let { data, error } = await supabaseWpp
        .from("meta_ads_insights")
        .select("*")
        .gte("date_start", from)
        .lte("date_start", to)
        .order("date_start", { ascending: true })
        .limit(1000);

      if (error) throw error;

      // Fallback: se não há dados no período, pega os mais recentes por campanha
      if (!data || data.length === 0) {
        const { data: fallback, error: err2 } = await supabaseWpp
          .from("meta_ads_insights")
          .select("*")
          .order("synced_at", { ascending: false })
          .limit(200);
        if (err2) throw err2;
        // deduplica por campaign_id — pega a entrada mais recente de cada
        const seen = new Set<string>();
        data = (fallback ?? []).filter((r: MetaAdsInsight) => {
          if (seen.has(r.campaign_id)) return false;
          seen.add(r.campaign_id);
          return true;
        });
      }

      return (data ?? []) as MetaAdsInsight[];
    },
    staleTime: 1000 * 60 * 10, // 10 min — job N8N roda a cada 6h
  });
}
