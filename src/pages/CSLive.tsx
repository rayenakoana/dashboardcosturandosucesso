import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendas } from "@/hooks/useVendas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { ArrowLeft, TrendingUp, Trophy, Zap } from "lucide-react";

// Cores fixas por funil (ordem: Segredos, UniForce, Paraguai, Club, Europa, China)
const FUNIL_CORES: Record<string, string> = {
  "Segredos da Confecção": "#E8192C",
  "UniForce": "#C9A017",
  "Imersões Paraguai": "#4A9EFF",
  "CS Club": "#7C3AED",
  "Imersão Europa": "#10B981",
  "Imersão China": "#F97316",
};

const FUNIS_ORDEM = [
  "Segredos da Confecção",
  "UniForce",
  "Imersões Paraguai",
  "CS Club",
  "Imersão Europa",
  "Imersão China",
];

const EMOJIS = ["🎉", "🔥", "💰", "🚀", "🏆", "⚡", "✨"];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CSLive() {
  const { data: vendas = [] } = useVendas();
  const queryClient = useQueryClient();
  const { data: metaCfg = [] } = useConfiguracoes("Meta Venda Geral");
  const { data: funis = [] } = useConfiguracoes("Funil");
  const [filterFunis, setFilterFunis] = useState<string[]>([]);
  const toggleFunil = (nome: string) => {
    setFilterFunis(prev => prev.includes(nome) ? prev.filter(f => f !== nome) : [...prev, nome]);
  };

  const now = new Date();
  const mesRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${mesRef}-01`;

  const vendasDoMes = useMemo(
    () => vendas.filter(v =>
      v.status === "Fechado" &&
      v.data_fechamento &&
      v.data_fechamento >= monthStart &&
      (filterFunis.length === 0 || filterFunis.includes(v.funil))
    ),
    [vendas, monthStart, filterFunis]
  );
  const faturamento = vendasDoMes.reduce((s, v) => s + Number(v.valor), 0);
  const totalVendas = vendasDoMes.length;

  const meta = useMemo(() => {
    const item = (metaCfg as any[]).find((m) => m.mes_ref === mesRef);
    return item ? Number(item.valor) || 0 : (metaCfg[0] ? Number(metaCfg[0].valor) : 0);
  }, [metaCfg, mesRef]);
  const pctMeta = meta > 0 ? Math.min(100, (faturamento / meta) * 100) : 0;

  // Leads do dia por funil
  const [leadsHoje, setLeadsHoje] = useState<Record<string, number>>({});
  const totalLeadsHoje = Object.values(leadsHoje).reduce((s, v) => s + v, 0);

  const hoje = new Date().toISOString().split("T")[0];

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

  // Detect new sales
  const knownIds = useRef<Set<string>>(new Set());
  const [pop, setPop] = useState<{ emoji: string; key: number } | null>(null);
  const [pulse, setPulse] = useState(false);
  const initialized = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!initialized.current) {
      vendasDoMes.forEach(v => knownIds.current.add(v.id));
      initialized.current = true;
      return;
    }
    const newOnes = vendasDoMes.filter(v => !knownIds.current.has(v.id));
    if (newOnes.length === 0) return;
    newOnes.forEach(v => {
      knownIds.current.add(v.id);
      celebrate(Number(v.valor));
    });
  }, [vendasDoMes]);

  // Realtime: avisa esta tela sempre que uma venda for inserida/atualizada
  // em QUALQUER dispositivo (não só na aba que fez a alteração).
  useEffect(() => {
    const channel = supabase
      .channel("cs-live-vendas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["vendas"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  function celebrate(valor: number) {
    // Confetti burst
    confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.6 },
      colors: ["#E8192C", "#C9A017", "#ffffff", "#8a1520"],
    });
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#E8192C", "#C9A017", "#ffffff", "#8a1520"] }), 200);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#E8192C", "#C9A017", "#ffffff", "#8a1520"] }), 400);

    // Emoji pop
    setPop({ emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)], key: Date.now() });
    setTimeout(() => setPop(null), 2200);

    // Counter pulse
    setPulse(true);
    setTimeout(() => setPulse(false), 700);

    // Toast
    toast.success(`🎉 Nova venda: ${formatBRL(valor)}!`, { duration: 6000 });

    // Sound (silent fallback if file missing)
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play().catch(() => {});
      }
    } catch { /* ignore */ }
  }

  // Demo trigger (manual celebration) for QA
  function demoTrigger() { celebrate(15000); }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 md:p-16 relative overflow-hidden">
      {/* audio with silent fallback */}
      <audio ref={audioRef} src="/sounds/applause.mp3" preload="auto" />

      {/* back link */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm z-10"
      >
        <ArrowLeft className="h-4 w-4" /> Sair do modo Live
      </Link>

      <button
        onClick={demoTrigger}
        className="absolute top-6 right-6 text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground z-10"
      >
        <Zap className="inline h-3 w-3 mr-1" /> Testar comemoração
      </button>

      {/* Emoji pop */}
      {pop && (
        <div
          key={pop.key}
          className="pointer-events-none fixed inset-0 flex items-center justify-center z-30"
        >
          <div className="text-[12rem] animate-count-pop drop-shadow-[0_0_40px_rgba(232,25,44,0.6)]">
            {pop.emoji}
          </div>
        </div>
      )}



      {/* Header */}
      <div className="text-center mb-12 z-10">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-muted-foreground mb-3">
          CS Dash · Live
        </div>
        <h1 className="font-display font-bold text-5xl md:text-7xl tracking-wide">
          <span className="text-gradient">FATURAMENTO</span>{" "}
          <span className="text-foreground">EM TEMPO REAL</span>
        </h1>
      </div>

      {/* Main counter */}
      <div className="text-center mb-16 z-10">
        <div
          className={`font-display font-bold text-7xl md:text-[10rem] leading-none tracking-tight transition-all ${
            pulse ? "animate-count-pop text-gradient-gold" : "text-foreground"
          }`}
        >
          {formatBRL(faturamento)}
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            <span className="font-display text-2xl text-foreground">{totalVendas}</span>
            <span className="text-sm">vendas no mês</span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-display text-2xl text-foreground">{pctMeta.toFixed(1)}%</span>
            <span className="text-sm">da meta</span>
          </div>
        </div>
      </div>

      {/* Meta gauge (bar) */}
      <div className="w-full max-w-4xl z-10">
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Meta do mês</span>
          <span className="font-display text-lg text-gold">{formatBRL(meta)}</span>
        </div>
        <div className="relative h-6 rounded-full bg-muted/40 border border-border overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-red animate-pulse-glow transition-all duration-700"
            style={{ width: `${pctMeta}%` }}
          />
          {/* gold marker */}
          <div className="absolute inset-y-0 right-0 w-1 bg-gold" />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>R$ 0</span>
          <span>{pctMeta.toFixed(1)}% atingido</span>
          <span>{formatBRL(meta)}</span>
        </div>
        {meta > 0 && (
          <div className="text-center mt-3 text-sm text-primary/80">
            {faturamento >= meta
              ? "🎉 Meta batida!"
              : `Faltam ${formatBRL(meta - faturamento)} para bater a meta`}
          </div>
        )}
      </div>

      {/* Divisória */}
      <div className="w-full max-w-4xl border-t border-border/40 my-10 z-10" />

      {/* Bloco de leads do dia */}
      <div className="w-full max-w-4xl z-10 flex flex-col items-center gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Leads recebidos hoje
          </span>
          <span className="bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-widest animate-pulse">
            LIVE
          </span>
        </div>

        {/* Número total */}
        <div className="flex flex-col items-center gap-1">
          <div className="font-display font-bold text-7xl md:text-8xl leading-none text-primary"
            style={{ textShadow: "0 0 40px rgba(232,25,44,0.35)" }}>
            {totalLeadsHoje}
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            leads hoje
          </div>
        </div>

        {/* Grid de funis */}
        <div className="grid grid-cols-6 gap-3 w-full">
          {FUNIS_ORDEM.map((funil) => {
            const cor = FUNIL_CORES[funil] ?? "#666";
            const count = leadsHoje[funil] ?? 0;
            return (
              <div
                key={funil}
                className="flex flex-col items-center gap-2 bg-card/60 border border-border rounded-xl p-3 text-center"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: cor }}
                />
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight min-h-[28px] flex items-center justify-center">
                  {funil}
                </div>
                <div
                  className="font-display font-bold text-3xl leading-none"
                  style={{ color: cor }}
                >
                  {count}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground/50">
                  leads
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé atualização */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/30">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Atualiza automaticamente em tempo real
        </div>
      </div>
    </div>
  );
}
