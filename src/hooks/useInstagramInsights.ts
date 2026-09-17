import { useQuery } from "@tanstack/react-query";
import { supabaseWpp } from "@/integrations/supabase/wppClient";

export interface InstagramAccountDaily {
  id: number;
  account_id: string;
  username: string;
  date: string;
  followers_count: number;
  media_count: number;
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
      const { data, error } = await supabaseWpp
        .from("instagram_account_daily")
        .select("*")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as InstagramAccountDaily[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useInstagramPostInsights(from: string, to: string) {
  return useQuery({
    queryKey: ["instagram_post_insights", from, to],
    queryFn: async () => {
      const { data, error } = await supabaseWpp
        .from("instagram_post_insights")
        .select("*")
        .gte("posted_at", from)
        .lte("posted_at", to + "T23:59:59Z")
        .order("posted_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as InstagramPostInsight[];
    },
    staleTime: 1000 * 60 * 10,
  });
}
