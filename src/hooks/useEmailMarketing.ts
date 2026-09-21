import { useQuery } from "@tanstack/react-query";
import { supabaseWpp } from "@/integrations/supabase/wppClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailCampaign {
  id: string;
  name: string;
  type: "news" | "commercial";
  subject: string | null;
  sent_at: string | null;
  version: string;
  ab_group_id: string | null;
  recipients: number;
  delivered: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  spam_rate: number;
  unsubscribe_rate: number;
  engaged: number;
  disengaged: number;
  indeterminate: number;
  invalid: number;
  synced_at: string;
}

export interface EmailAutomation {
  id: string;
  name: string;
  status: string;
  leads_entered: number;
  leads_active: number;
  qualifications: number;
  opportunities: number;
  sales: number;
  conversion_rate: number;
  rd_created_at: string | null;
  rd_updated_at: string | null;
  synced_at: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useEmailCampaigns(from: string, to: string) {
  return useQuery({
    queryKey: ["email_campaigns", from, to],
    queryFn: async () => {
      const { data, error } = await supabaseWpp
        .from("email_campaigns")
        .select("*")
        .gte("sent_at", from)
        .lte("sent_at", to + "T23:59:59")
        .order("sent_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as EmailCampaign[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useEmailAutomations() {
  return useQuery({
    queryKey: ["email_automations"],
    queryFn: async () => {
      const { data, error } = await supabaseWpp
        .from("email_automations")
        .select("*")
        .order("leads_entered", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as EmailAutomation[];
    },
    staleTime: 1000 * 60 * 30,
  });
}
