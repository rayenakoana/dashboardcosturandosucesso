// cs-live-prototipo-animacoes-v1
// Celebrações desenhadas a partir do protótipo aprovado. Sem fotos de fundo.
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { ShoppingCart, Crown, Trophy } from "lucide-react";
import "@/styles/csLiveCelebrationsV1.css";

export type CsLiveCelebration =
  | { id: number; kind: "sale"; amount: number; product: string }
  | { id: number; kind: "goal"; amount: number; goal: number; period: string };

const currency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 0,
  });

export function CSLiveCelebrations({
  event,
  goalReached,
}: {
  event: CsLiveCelebration | null;
  goalReached: boolean;
}) {
  const lastAnimated = useRef<number | null>(null);

  useEffect(() => {
    if (!event || lastAnimated.current === event.id) return;
    lastAnimated.current = event.id;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gold = event.kind === "goal";
    const palette = gold
      ? ["#ffbb35", "#ffdf79", "#fffae8", "#f3a32e"]
      : ["#f7304e", "#ff7791", "#ffffff", "#bd1e3a"];
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const burst = (delay: number, count: number, x: number, angle?: number) => {
      timers.push(setTimeout(() => {
        void confetti({
          particleCount: count,
          spread: gold ? 95 : 78,
          startVelocity: gold ? 50 : 42,
          gravity: gold ? 0.75 : 0.98,
          scalar: gold ? 1.04 : 0.9,
          origin: { x, y: gold ? 0.58 : 0.53 },
          colors: palette,
          ...(angle === undefined ? {} : { angle }),
          zIndex: 160,
        });
      }, delay));
    };
    if (gold) {
      burst(150, 130, 0.5);
      burst(600, 100, 0.05, 65);
      burst(650, 100, 0.95, 115);
      burst(1450, 110, 0.5);
      burst(2500, 90, 0.1, 70);
      burst(2550, 90, 0.9, 110);
      burst(3700, 100, 0.5);
      burst(5400, 85, 0.5);
    } else {
      burst(230, 95, 0.12, 65);
      burst(380, 105, 0.88, 115);
      burst(950, 85, 0.5);
      burst(1900, 65, 0.15, 70);
      burst(2100, 65, 0.85, 110);
    }
    return () => { timers.forEach(clearTimeout); };
  }, [event]);

  return (
    <>
      {/* A conquista permanece sinalizada após a animação, sem cobrir o painel. */}
      {goalReached && <span className="cs-live-meta-persistente" aria-hidden="true" />}
      {event && (
        <div
          key={event.id}
          className={`cs-live-animacao cs-live-animacao--${event.kind}`}
          role="status"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="cs-live-animacao__ambiente" aria-hidden="true" />
          <div className="cs-live-animacao__raios" aria-hidden="true" />
          <div className="cs-live-animacao__particulas" aria-hidden="true">
            {Array.from({ length: event.kind === "goal" ? 26 : 17 }, (_, i) => (
              <i key={i} style={{
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 29 + 7) % 100}%`,
                animationDelay: `${(i % 7) * 0.15}s`,
              }} />
            ))}
          </div>
          {event.kind === "sale" ? (
            <div className="cs-live-animacao__centro cs-live-animacao__centro--venda">
              <span className="cs-live-animacao__icone"><ShoppingCart strokeWidth={2.6} /></span>
              <strong className="cs-live-animacao__titulo">VENDA!</strong>
              <div className="cs-live-animacao__valor">+ {currency(event.amount)}</div>
              <div className="cs-live-animacao__produto">{event.product}</div>
            </div>
          ) : (
            <div className="cs-live-animacao__centro cs-live-animacao__centro--meta">
              <span className="cs-live-animacao__icone"><Crown strokeWidth={2.2} /></span>
              <strong className="cs-live-animacao__titulo">META BATIDA!</strong>
              <div className="cs-live-animacao__valor">{currency(event.goal)}</div>
              <div className="cs-live-animacao__meta-barra"><span /></div>
              <div className="cs-live-animacao__porcentagem">100,0% · META ATINGIDA</div>
              <div className="cs-live-animacao__produto">
                <Trophy size={17} aria-hidden="true" /> {event.period}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
