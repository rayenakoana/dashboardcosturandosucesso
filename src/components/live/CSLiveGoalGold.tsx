import { type CSSProperties } from "react";
import "@/styles/csLiveGoalGold.css";

type Props = {
  active: boolean;
  intro: boolean;
  goal: number;
  month: string;
};

const notes = Array.from({ length: 36 }, (_, i) => ({
  x: (i * 37.9 + 7) % 97,
  delay: -((i * 2.31) % 17),
  duration: 8.8 + ((i * 13) % 9) * 0.61,
  drift: ((i * 47) % 180) - 90,
  rotation: ((i * 41) % 125) - 62,
  scale: 0.64 + ((i * 7) % 8) * .115,
}));

function Dinheiro({ celebracao = false }: { celebracao?: boolean }) {
  return (
    <div className={celebracao ? "cs-gold-money cs-gold-money--intro" : "cs-gold-money"} aria-hidden="true">
      {notes.map((n, i) => (
        <img
          key={i}
          src="/images/cs-live-gold/nota-dourada.svg"
          alt=""
          draggable={false}
          className="cs-gold-money__note"
          style={{
            "--gold-x": `${n.x}%`,
            "--gold-delay": `${n.delay}s`,
            "--gold-time": `${n.duration}s`,
            "--gold-drift": `${n.drift}px`,
            "--gold-spin": `${n.rotation}deg`,
            "--gold-scale": n.scale,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}


// Explosoes reais: cada centelha parte do centro e se expande individualmente.
// Existem apenas durante a abertura da meta; ao terminar o audio, o componente desmonta.
const goldBursts = [
  { x: "16%", y: "27%", delay: "0.1s", size: 1.05 },
  { x: "85%", y: "30%", delay: "1.05s", size: 1.08 },
  { x: "10%", y: "65%", delay: "2.0s", size: .82 },
  { x: "92%", y: "65%", delay: "2.85s", size: .9 },
  { x: "48%", y: "10%", delay: "3.8s", size: .7 },
];
const goldSparks = Array.from({ length: 36 }, (_, i) => {
  const angle = ((i * 360) / 36) * Math.PI / 180;
  const distance = 102 + (i % 5) * 17;
  return {
    dx: `${Math.cos(angle) * distance}px`,
    dy: `${Math.sin(angle) * distance}px`,
    angle: `${angle * 180 / Math.PI + 90}deg`,
    tone: i % 5 === 0 ? "#fff9e2" : i % 3 === 0 ? "#ffb63d" : "#ffda73",
  };
});

function FogosDourados() {
  return (
    <div className="cs-gold-intro__fireworks" aria-hidden="true">
      {goldBursts.map((burst, i) => (
        <div
          key={i}
          className="cs-gold-intro__burst"
          style={{
            "--firework-x": burst.x,
            "--firework-y": burst.y,
            "--firework-delay": burst.delay,
            "--firework-scale": burst.size,
          } as CSSProperties}
        >
          <span className="cs-gold-intro__burst-flash" />
          <span className="cs-gold-intro__burst-ring" />
          {goldSparks.map((spark, j) => (
            <i
              key={j}
              className="cs-gold-intro__spark"
              style={{
                "--spark-x": spark.dx,
                "--spark-y": spark.dy,
                "--spark-angle": spark.angle,
                "--spark-tone": spark.tone,
              } as CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CSLiveGoalGold({ active, intro, goal, month }: Props) {
  if (!active && !intro) return null;
  const valor = Number(goal || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 0,
  });
  return (
    <>
      {active && <Dinheiro />}
      {intro && (
        <div className="cs-gold-intro" role="status" aria-label={`Meta batida: ${valor}`}>
          <div className="cs-gold-intro__light" />
          <FogosDourados />
          <Dinheiro celebracao />
          <div className="cs-gold-intro__content">
            <div className="cs-gold-intro__crown" aria-hidden="true">♛</div>
            <h1>META BATIDA!</h1>
            <div className="cs-gold-intro__amount">{valor}</div>
            <div className="cs-gold-intro__bar"><span>100,0%</span></div>
            <div className="cs-gold-intro__month">— {month.toLocaleUpperCase("pt-BR")} —</div>
          </div>
        </div>
      )}
    </>
  );
}
