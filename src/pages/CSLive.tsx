import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendas } from "@/hooks/useVendas";
import { useConfiguracoes, useFunisVisiveis } from "@/hooks/useConfiguracoes";
import { CSLiveCelebrations, type CsLiveCelebration } from "@/components/live/CSLiveCelebrations";
import CSLiveExecutivePanel from "@/components/live/CSLiveExecutivePanel";
import CSLiveGoalGold from "@/components/live/CSLiveGoalGold";

export default function CSLive() {
  const { data: vendas = [], isSuccess: vendasReady } = useVendas();
  const queryClient = useQueryClient();
  const { data: metaCfg = [], isSuccess: metaReady } = useConfiguracoes("Meta Venda Geral");
  const { funisVisiveis: FUNIS_ORDEM } = useFunisVisiveis();
  const [filterFunis, setFilterFunis] = useState<string[]>([]);
  const toggleFunil = (nome: string) => {
    setFilterFunis(prev => prev.includes(nome) ? prev.filter(f => f !== nome) : [...prev, nome]);
  };

  // A virada do mes ocorre mesmo sem chegar uma nova venda ou lead.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(tick);
  }, []);
  const mesRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${mesRef}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString().split("T")[0]; // último dia do mês atual

  const vendasDoMes = useMemo(
    () => vendas.filter(v =>
      v.status === "Fechado" &&
      v.data_fechamento &&
      v.data_fechamento >= monthStart &&
      v.data_fechamento <= monthEnd &&
      (filterFunis.length === 0 || filterFunis.includes(v.funil))
    ),
    [vendas, monthStart, monthEnd, filterFunis]
  );
  const faturamento = vendasDoMes.reduce((s, v) => s + Number(v.valor), 0);
  const totalVendas = vendasDoMes.length;

  const meta = useMemo(() => {
    const item = (metaCfg as any[]).find((m) => m.mes_ref === mesRef);
    return item ? Number(item.valor) || 0 : (metaCfg[0] ? Number(metaCfg[0].valor) : 0);
  }, [metaCfg, mesRef]);
  const pctMeta = meta > 0 ? (faturamento / meta) * 100 : 0;

  // cs-live-meta-reversivel-v1
  // Tema dourado depende da meta REAL do mes, nao de um registro fixo no navegador.
  const goldPersistent = vendasReady && metaReady && meta > 0 && faturamento >= meta;
  const [goalIntroActive, setGoalIntroActive] = useState(false);
  const previousGold = useRef<boolean | null>(null);

  // Limpa apenas a chave OBSOLETA, sem apagar vendas ou configuracoes.
  useEffect(() => {
    try { window.localStorage.removeItem("cs-live:meta-batida:mes-v1"); }
    catch { /* armazenamento bloqueado */ }
  }, []);

  // Ao desfazer uma venda que derrubou a meta, para a celebracao pendente.
  // O tema normal e as fotos voltam pelo proprio goldPersistent.
  useEffect(() => {
    if (!vendasReady || !metaReady) return;
    if (previousGold.current === true && !goldPersistent) {
      if (goalTimer.current) {
        clearTimeout(goalTimer.current);
        goalTimer.current = null;
      }
      const audio = metaAudioRef.current;
      if (audio) {
        audio.pause();
        try { audio.currentTime = 0; } catch { /* audio nao pronto */ }
      }
      setGoalIntroActive(false);
    }
    previousGold.current = goldPersistent;
  }, [vendasReady, metaReady, goldPersistent]);


  // Leads do dia por funil
  const [leadsHoje, setLeadsHoje] = useState<Record<string, number>>({});

  const hoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  async function fetchLeadsHoje() {
    const { data } = await supabase
      .from("leads_diarios_por_funil")
      .select("funil, total_leads")
      .eq("data", hoje);
    if (data) {
      const map: Record<string, number> = {};
      data.forEach((row: any) => { map[row.funil] = row.total_leads; });
      setLeadsHoje(map);
    }
  }

  useEffect(() => {
    fetchLeadsHoje();
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchLeadsHoje, 30000);
    return () => clearInterval(interval);
  }, []);

  // cs-live-prototipo-animacoes-v1
  // Registra as vendas ja existentes na primeira carga: nunca as comemora novamente.
  const seenSaleIds = useRef<Set<string>>(new Set());
  const salesBootstrapped = useRef(false);
  const [pulse, setPulse] = useState(false);
  const [celebration, setCelebration] = useState<CsLiveCelebration | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const metaAudioRef = useRef<HTMLAudioElement | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saleStartedAt = useRef(0);
  const goalInitialized = useRef(false);
  const goalCelebrated = useRef(false);
  const eventCounter = useRef(0);

  useEffect(() => () => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    if (goalTimer.current) clearTimeout(goalTimer.current);
  }, []);

  function playExistingAudio(ref: { current: HTMLAudioElement | null }) {
    try {
      if (!ref.current) return;
      ref.current.currentTime = 0;
      void ref.current.play().catch(() => {
        // Navegadores podem bloquear autoplay ate uma interacao com o painel.
      });
    } catch { /* áudio é opcional, não interrompe a animação */ }
  }

  function launchEvent(
    next: { kind: "sale"; amount: number; product: string } | { kind: "goal"; amount: number; goal: number; period: string },
    durationMs?: number,
  ) {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    const id = ++eventCounter.current;
    setCelebration({ ...next, id });
    celebrationTimer.current = setTimeout(
      () => setCelebration(current => current?.id === id ? null : current),
      durationMs ?? (next.kind === "goal" ? 8500 : 4600)
    );
  }

  function celebrate(amount: number, product: string) {
    saleStartedAt.current = Date.now();
    launchEvent({ kind: "sale", amount, product });
    setPulse(true);
    setTimeout(() => setPulse(false), 650);
    playExistingAudio(audioRef);
  }

  function celebrarMeta() {
    playExistingAudio(metaAudioRef);
  }

  function demoTrigger() {
    celebrate(4997, "Venda de demonstração");
  }

  useEffect(() => {
    if (!vendasReady) return;
    const fechadas = vendas.filter(v => v.status === "Fechado");
    if (!salesBootstrapped.current) {
      fechadas.forEach(v => seenSaleIds.current.add(v.id));
      salesBootstrapped.current = true;
      return;
    }
    const novas = fechadas.filter(v => !seenSaleIds.current.has(v.id));
    novas.forEach(v => seenSaleIds.current.add(v.id));
    const desteMes = novas.filter(v =>
      v.data_fechamento &&
      v.data_fechamento >= monthStart &&
      v.data_fechamento <= monthEnd &&
      (filterFunis.length === 0 || (v.funil && filterFunis.includes(v.funil)))
    );
    if (desteMes.length > 0) {
      const venda = desteMes[desteMes.length - 1];
      celebrate(Number(venda.valor), venda.funil || "Funil não identificado");
    }
  }, [vendas, vendasReady, monthStart, monthEnd, filterFunis]);

  // Realtime existente: invalida o cache quando um dispositivo altera vendas.
  useEffect(() => {
    const channel = supabase
      .channel("cs-live-vendas")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendas" },
        () => { void queryClient.invalidateQueries({ queryKey: ["vendas"] }); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  // Meta: somente a passagem para o alvo causada por venda ao vivo gera celebracao.
  // Alternar filtros, recarregar a pagina ou editar a configuracao nao gera efeito sonoro.
  useEffect(() => {
    if (!vendasReady || !metaReady || meta <= 0) return;
    if (!goalInitialized.current) {
      goalInitialized.current = true;
      goalCelebrated.current = faturamento >= meta;
      return;
    }
    if (faturamento < meta) {
      goalCelebrated.current = false;
      return;
    }
    if (goalCelebrated.current || faturamento < meta) return;
    goalCelebrated.current = true;
    if (Date.now() - saleStartedAt.current < 1500) {
      if (goalTimer.current) clearTimeout(goalTimer.current);
      goalTimer.current = setTimeout(() => celebrarMeta(), 4800);
    }
  }, [faturamento, meta, vendasReady, metaReady]);

  // cs-live-executivo-glass-v2: apenas apresentacao; efeitos/sons continuam no pai.
  return (
    <div
        className={`cs-live-executivo-root ${goldPersistent ? "cs-live-after-goal cs-live-gold-persistent" : ""}`}
      >
      <audio ref={audioRef} src="/sounds/applause.mp3" preload="auto" />
      <audio
        ref={metaAudioRef}
        src="/sounds/celebracao_meta.mp3"
        preload="auto"
        onPlay={() => setGoalIntroActive(true)}
        onEnded={() => setGoalIntroActive(false)}
        onError={() => setGoalIntroActive(false)}
        onPause={() => setGoalIntroActive(false)}
      />
      <CSLiveGoalGold
        active={goldPersistent}
        intro={goalIntroActive}
        goal={meta}
        month={new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
      />
      <CSLiveExecutivePanel
        vendas={vendas}
        vendasReady={vendasReady}
        leadsHoje={leadsHoje}
        funis={FUNIS_ORDEM}
        filterFunis={filterFunis}
        toggleFunil={toggleFunil}
        faturamento={faturamento}
        totalVendas={totalVendas}
        meta={meta}
        pctMeta={pctMeta}
        pulse={pulse}
        hoje={hoje}
        monthStart={monthStart}
        monthEnd={monthEnd}
        testarVenda={demoTrigger}
        testarMeta={celebrarMeta}
      />
      <CSLiveCelebrations event={celebration?.kind === "goal" ? null : celebration} goalReached={goldPersistent} />
    </div>
  );
}
