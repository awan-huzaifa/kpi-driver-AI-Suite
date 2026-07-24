"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mouseX = -100, mouseY = -100;
    let ringX  = -100, ringY  = -100;
    let rafId: number;

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    function onEnterInteractive() {
      if (ringRef.current) {
        ringRef.current.style.width  = "44px";
        ringRef.current.style.height = "44px";
        ringRef.current.style.borderColor = "rgba(67,183,73,0.7)";
        ringRef.current.style.boxShadow   = "0 0 12px rgba(67,183,73,0.25)";
      }
      if (dotRef.current) {
        dotRef.current.style.transform = "translate(-50%,-50%) scale(0.5)";
      }
    }

    function onLeaveInteractive() {
      if (ringRef.current) {
        ringRef.current.style.width  = "28px";
        ringRef.current.style.height = "28px";
        ringRef.current.style.borderColor = "rgba(48,125,192,0.55)";
        ringRef.current.style.boxShadow   = "0 0 8px rgba(48,125,192,0.2)";
      }
      if (dotRef.current) {
        dotRef.current.style.transform = "translate(-50%,-50%) scale(1)";
      }
    }

    function loop() {
      // Smooth ring follows mouse with lag (lerp factor 0.14)
      ringX += (mouseX - ringX) * 0.14;
      ringY += (mouseY - ringY) * 0.14;

      if (dotRef.current) {
        dotRef.current.style.left = mouseX + "px";
        dotRef.current.style.top  = mouseY + "px";
      }
      if (ringRef.current) {
        ringRef.current.style.left = ringX + "px";
        ringRef.current.style.top  = ringY + "px";
      }

      rafId = requestAnimationFrame(loop);
    }

    document.addEventListener("mousemove", onMove);

    const interactives = () =>
      document.querySelectorAll<HTMLElement>("a, button, input, textarea, select, [role='button'], label[for]");

    function attachListeners() {
      interactives().forEach(el => {
        el.addEventListener("mouseenter", onEnterInteractive);
        el.addEventListener("mouseleave", onLeaveInteractive);
      });
    }

    attachListeners();
    const observer = new MutationObserver(attachListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    rafId = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          pointerEvents: "none",
          zIndex: 99999,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#307DC0",
          transform: "translate(-50%, -50%)",
          transition: "transform 0.15s ease",
          boxShadow: "0 0 6px rgba(48,125,192,0.8), 0 0 12px rgba(48,125,192,0.4)",
          mixBlendMode: "normal",
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          pointerEvents: "none",
          zIndex: 99998,
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "1.5px solid rgba(48,125,192,0.55)",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 8px rgba(48,125,192,0.2)",
          transition: "width 0.2s ease, height 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      />
    </>
  );
}
