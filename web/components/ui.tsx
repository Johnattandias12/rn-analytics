"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function Card({ children, className = "", hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return <div className={`card ${hover ? "card-hover" : ""} ${className}`}>{children}</div>;
}

export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function useCountUp(target: number, duration = 1100) {
  const [val, setVal] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return val;
}

export function Kpi({ label, value, sub, accent, delay = 0 }: { label: string; value: string; sub?: string; accent?: "navy" | "green" | "gold" | "royal"; delay?: number }) {
  const color = accent === "green" ? "var(--green)" : accent === "gold" ? "#caa106" : accent === "royal" ? "var(--royal)" : "var(--navy)";
  return (
    <Reveal delay={delay}>
      <Card hover className="p-5 h-full">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
        <div className="text-[28px] leading-none font-extrabold tnum mt-2" style={{ color }}>{value}</div>
        {sub && <div className="text-xs text-[color:var(--muted)] mt-1.5">{sub}</div>}
      </Card>
    </Reveal>
  );
}

export function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3.5 border border-[color:var(--line)] bg-[#f8fafd]">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="text-[17px] font-bold tnum text-[color:var(--navy)] mt-1">{value}</div>
    </div>
  );
}

export function SectionTitle({ kicker, title, desc }: { kicker?: string; title: string; desc?: string }) {
  return (
    <div className="mb-5">
      {kicker && <div className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--royal)] mb-1.5">{kicker}</div>}
      <h2 className="text-2xl sm:text-3xl h-display text-[color:var(--navy)]">{title}</h2>
      {desc && <p className="text-[15px] text-[color:var(--muted)] mt-2 max-w-2xl">{desc}</p>}
    </div>
  );
}
