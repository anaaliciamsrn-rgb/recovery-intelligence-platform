import { useEffect, useState } from "react";

/**
 * Anima de 0 até `value` ao montar. Deliberadamente não depende de
 * `IntersectionObserver` (scroll-into-view) — em compensação por um delay
 * fixo (`delayMs`, escalonado por card via `stagger-N` no elemento pai),
 * mais simples e robusto do que gatilho de scroll, que se mostrou instável
 * em alguns contextos de renderização (aba em segundo plano, sem
 * compositing ativo) sem trazer benefício de UX real numa seção que já
 * fica perto do topo da página.
 */
export function CountUpStat({
  value,
  suffix = "",
  label,
  delayMs = 0,
}: {
  value: number;
  suffix?: string;
  label: string;
  delayMs?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const durationMs = 1200;
    let frameId: number;

    const startTimeout = setTimeout(() => {
      const startedAt = performance.now();

      function tick(now: number) {
        const progress = Math.min((now - startedAt) / durationMs, 1);
        const eased = 1 - (1 - progress) ** 3;
        setDisplay(Math.round(eased * value));
        if (progress < 1) frameId = requestAnimationFrame(tick);
      }

      frameId = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      clearTimeout(startTimeout);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value, delayMs]);

  return (
    <div className="text-center">
      <p
        className="text-3xl font-bold tabular-nums sm:text-4xl"
        style={{ color: "var(--color-primary)" }}
      >
        {display}
        {suffix}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
    </div>
  );
}
