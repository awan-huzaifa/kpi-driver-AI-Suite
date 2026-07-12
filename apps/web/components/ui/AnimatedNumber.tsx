"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedNumber({
  value,
  duration = 1400,
  decimals = 0,
  prefix = "",
  suffix = "",
}: Props) {
  const [display, setDisplay] = useState(0);
  const rafRef  = useRef<number>(0);
  const startTs = useRef<number>(0);

  useEffect(() => {
    const from = display;
    const to   = value;

    const step = (ts: number) => {
      if (!startTs.current) startTs.current = ts;
      const progress = Math.min((ts - startTs.current) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    startTs.current = 0;
    rafRef.current  = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatted = display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return <>{prefix}{formatted}{suffix}</>;
}
