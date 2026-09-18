import { useQuery } from "@tanstack/react-query";
import { supabaseWpp } from "@/integrations/supabase/wppClient";

export interface InstagramAccountDaily {
  id: number;
  account_id: string;
  username: string;
  date: string;
  followers_count: number;
  media_count: number;
  followers_gained: number;
  followers_lost: number;
}

export interface InstagramPostInsight {
  id: number;
  post_id: string;
  account_id: string;
  username: string;
  posted_at: string;
  media_type: string;
  permalink: string;
  caption: string;
  like_count: number;
  comments_count: number;
  shares: number;
  saved: number;
  reach: number;
  impressions: number;
  views: number;
  synced_at: string;
}

export function useInstagramAccountDaily(from: string, to: string) {
  return useQuery({
    queryKey: ["instagram_account_daily", from, to],
    queryFn: async () => {
      // Busca tudo e filtra no cliente — tabela pequena (snapshot diário, 2 contas)
      const { data, error } = await supabaseWpp
        .from("instagram_account_daily")
        .select("*")
        .order("date", { ascending: true })
        .limit(1000);
      if (error) throw error;
      const rows = (data ?? []) as InstagramAccountDaily[];
      return rows.filter(r => r.date >= from && r.date <= to);
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useInstagramPostInsights(from: string, to: string) {
  return useQuery({
    queryKey: ["instagram_post_insights", from, to],
    queryFn: async () => {
      // Busca tudo e filtra no cliente — PostgREST não aceita dois filtros
      // no mesmo campo timestamptz com schema wpp
      const { data, error } = await supabaseWpp
        .from("instagram_post_insights")
        .select("*")
        .order("posted_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const rows = (data ?? []) as InstagramPostInsight[];
      const fromTs = new Date(from + "T00:00:00Z").getTime();
      const toTs   = new Date(to   + "T23:59:59Z").getTime();
      return rows.filter(r => {
        const t = new Date(r.posted_at).getTime();
        return t >= fromTs && t <= toTs;
      });
    },
    staleTime: 1000 * 60 * 10,
  });
}

export interface InstagramProfileDaily {
  id: number;
  account_id: string;
  username: string;
  date: string;
  profile_views: number;
  website_clicks: number;
}

export function useInstagramProfileDaily(from: string, to: string) {
  return useQuery({
    queryKey: ["instagram_profile_daily", from, to],
    queryFn: async () => {
      const { data, error } = await supabaseWpp
        .from("instagram_profile_daily")
        .select("*")
        .order("date", { ascending: true })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as InstagramProfileDaily[];
      return rows.filter(r => r.date >= from && r.date <= to);
    },
    staleTime: 1000 * 60 * 10,
  });
}
