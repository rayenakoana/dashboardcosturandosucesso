import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useVendas } from "@/hooks/useVendas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { ArrowLeft, TrendingUp, Trophy, Zap } from "lucide-react";

const EMOJIS = ["🎉", "🔥", "💰", "🚀", "🏆", "⚡", "✨"];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CSLive() {
  const { data: vendas = [] } = useVendas();
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

      {/* Filtro por funil */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8 z-10 max-w-2xl">
        <button
          onClick={() => setFilterFunis([])}
          className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
            filterFunis.length === 0
              ? "text-white border-transparent bg-gradient-red"
              : "bg-muted/40 text-muted-foreground border-border hover:border-primary/50"
          }`}
        >
          Todos os funis
        </button>
        {(funis as any[]).map((f) => {
          const active = filterFunis.includes(f.valor);
          return (
            <button
              key={f.id}
              onClick={() => toggleFunil(f.valor)}
              className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                active
                  ? "text-white border-transparent bg-gradient-red"
                  : "bg-muted/40 text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {f.valor}
            </button>
          );
        })}
      </div>

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
    </div>
  );
}
