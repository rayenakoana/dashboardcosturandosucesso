import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SDR {
  id: string;
  nome: string;
  foto_url: string | null;
  rd_user_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SDRPerformance {
  sdr: SDR;
  tarefasConcluidas: number;
  tarefasAgendadas: number;
  dealsSobResponsabilidade: number;
  qualificacoes: number;
  dealsEsfriando: number;
  dealsEmAndamento: number;
  tempoMedioPrimeiroContatoMs: number | null;
}

const DIAS_ESFRIANDO = 3;

export function useSDRs(somenteAtivos = false) {
  return useQuery({
    queryKey: ["sdrs", somenteAtivos],
    queryFn: async () => {
      let q = supabase.from("sdrs").select("*").order("nome");
      if (somenteAtivos) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as SDR[];
    },
  });
}

export function useAddSDR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nome, rd_user_id }: { nome: string; rd_user_id?: string }) => {
      const { data, error } = await supabase.from("sdrs").insert({ nome, rd_user_id: rd_user_id || null }).select().single();
      if (error) throw error;
      return data as SDR;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sdrs"] }),
  });
}

export function useUpdateSDR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<SDR> & { id: string }) => {
      const { error } = await supabase.from("sdrs").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sdrs"] }),
  });
}

export function useDeleteSDR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sdrs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sdrs"] }),
  });
}

export function useUploadFotoSDR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const ext = file.name.split(".").pop();
      const path = `${id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("sdr-fotos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from("sdr-fotos").getPublicUrl(path);
      const { error: updateError } = await supabase.from("sdrs").update({ foto_url: pub.publicUrl, updated_at: new Date().toISOString() }).eq("id", id);
      if (updateError) throw updateError;
      return pub.publicUrl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sdrs"] }),
  });
}

/**
 * Performance por SDR, opcionalmente filtrada por funil.
 * Agrega deals_sdr_tracking + tasks_sdr_tracking por rd_user_id.
 */
export function usePerformanceSDR(funil?: string) {
  const { data: sdrs = [] } = useSDRs(true);

  return useQuery({
    queryKey: ["performance-sdr", funil, sdrs.map(s => s.id).join(",")],
    enabled: sdrs.length > 0,
    queryFn: async (): Promise<SDRPerformance[]> => {
      let dealsQuery = supabase.from("deals_sdr_tracking").select("*");
      if (funil) dealsQuery = dealsQuery.eq("funil", funil);
      const { data: deals, error: dealsError } = await dealsQuery;
      if (dealsError) throw dealsError;

      const { data: allTasks, error: tasksError } = await supabase.from("tasks_sdr_tracking").select("*");
      if (tasksError) throw tasksError;

      // Se está filtrando por funil, só conta tarefas de deals que pertencem a esse funil.
      // Deals sem registro em deals_sdr_tracking (ex: sincronizados antes do tracking existir)
      // são ignorados no filtro por funil, mas contam quando não há filtro.
      const dealIdsNoFunil = funil ? new Set(deals?.map(d => d.deal_id)) : null;
      const tasks = funil
        ? (allTasks || []).filter(t => t.deal_id && dealIdsNoFunil!.has(t.deal_id))
        : (allTasks || []);

      const limiteEsfriando = new Date();
      limiteEsfriando.setDate(limiteEsfriando.getDate() - DIAS_ESFRIANDO);

      return sdrs
        .filter(sdr => sdr.rd_user_id)
        .map(sdr => {
          const dealsDoSdr = (deals || []).filter(d => d.rd_user_id === sdr.rd_user_id);
          const tasksDoSdr = (tasks || []).filter(t => t.rd_user_id === sdr.rd_user_id);

          const dealsAbertos = dealsDoSdr.filter(d => d.status !== "Fechado" && d.status !== "Perdido");
          const dealsEsfriando = dealsAbertos.filter(d => d.ultima_atividade_em && new Date(d.ultima_atividade_em) < limiteEsfriando);
          const dealsEmAndamento = dealsDoSdr.filter(d => d.status === "Em andamento");
          const qualificacoes = dealsDoSdr.filter(d => (d.rating ?? 0) >= 3);

          const temposPrimeiroContato = dealsDoSdr
            .filter(d => d.criado_em && d.status_andamento_em)
            .map(d => new Date(d.status_andamento_em!).getTime() - new Date(d.criado_em!).getTime());
          const tempoMedioPrimeiroContatoMs = temposPrimeiroContato.length > 0
            ? temposPrimeiroContato.reduce((a, b) => a + b, 0) / temposPrimeiroContato.length
            : null;

          return {
            sdr,
            tarefasConcluidas: tasksDoSdr.filter(t => t.status === "concluida").length,
            tarefasAgendadas: tasksDoSdr.filter(t => t.status === "agendada").length,
            dealsSobResponsabilidade: dealsDoSdr.length,
            qualificacoes: qualificacoes.length,
            dealsEsfriando: dealsEsfriando.length,
            dealsEmAndamento: dealsEmAndamento.length,
            tempoMedioPrimeiroContatoMs,
          };
        })
        .sort((a, b) => b.qualificacoes - a.qualificacoes);
    },
  });
}

export function formatTempo(ms: number | null): string {
  if (ms === null) return "—";
  const horas = Math.floor(ms / 3_600_000);
  const minutos = Math.floor((ms % 3_600_000) / 60_000);
  if (horas === 0) return `${minutos}m`;
  return `${horas}h ${minutos}m`;
}
