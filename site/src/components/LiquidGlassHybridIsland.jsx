/**
 * LiquidGlassHybridIsland.jsx
 *
 * PURPOSE
 * - Combine TRUE, live page blur (CSS backdrop-filter) with Specy's WebGL refraction.
 * - Expose Flutter-like knobs (thickness/specular/rim) without porting shaders.
 *
 * UPSTREAMS / CREDITS (MIT):
 * - Specy Liquid Glass (WebGL screenshot+refraction):
 *   GitHub: https://github.com/Specy/liquid-glass
 *   NPM:   https://www.npmjs.com/package/@specy/liquid-glass-react
 *
 * - Flutter liquid_glass_renderer (aesthetic parameters we echo here):
 *   GitHub: https://github.com/whynotmake-it/flutter_liquid_glass/tree/main/packages/liquid_glass_renderer
 *
 * IMPLEMENTATION SUMMARY
 * - Specy component captures a screenshot of a target DOM node (e.g., document.body)
 *   and refracts it inside a WebGL "glass".
 * - We add a DOM overlay above Specy that applies CSS backdrop-filter to the REAL page,
 *   plus Apple-style rim + inner highlight + micro-noise + a subtle specular sweep.
 *
 * INTEGRATION CHECKLIST FOR LLM AGENT (VS Code):
 * 1) Ensure dependencies are installed (react, react-dom, @specy/liquid-glass-react).
 * 2) Save this file at: src/components/LiquidGlassHybridIsland.jsx
 * 3) Use it in an Astro page (see usage snippet below) with `client:load`.
 * 4) Keep wrapper radius/blur consistent across CSS & props.
 * 5) IMPORTANT: Call `updateScreenshot()` on resize or when layout behind the glass changes.
 *    (This file already wires resize/scroll throttling.)
 */

import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { LiquidGlass } from "@specy/liquid-glass-react";

// Flutter-ish defaults (mapped into web controls)
const DEFAULTS = {
  blur: 30,                 // CSS backdrop blur (true page blur)
  saturation: 1.8,          // CSS saturation
  thickness: 0.6,           // "weight" of glass (we map to Specy thickness)
  specularIntensity: 0.22,  // subtle sheen overlay strength
  radiusPx: 28,             // corner radius (px) for DOM wrapper
  borderColor: "rgba(255,255,255,.22)",
  innerHighlight: true
};

export default function LiquidGlassHybridIsland({
  blur = DEFAULTS.blur,
  saturation = DEFAULTS.saturation,
  thickness = DEFAULTS.thickness,
  specularIntensity = DEFAULTS.specularIntensity,
  radiusPx = DEFAULTS.radiusPx,
  borderColor = DEFAULTS.borderColor,
  innerHighlight = DEFAULTS.innerHighlight,
  target = "body"   // what DOM subtree to "screenshot" for refraction
}) {
  const ref = useRef(null);

  // Map Flutter-ish controls to Specy's glassStyle
  // Specy: depth, thickness, ior, dispersion, transmission, reflectivity, roughness, radius(0–1), segments
  const glassStyle = useMemo(() => ({
    depth: 0.6,
    thickness,
    ior: 1.5,          // glass
    dispersion: 0.08,
    transmission: 1.0,
    reflectivity: 0.5,
    roughness: 0.08,
    radius: 0.28,
    segments: 64
  }), [thickness]);

  const updateShot = useCallback(() => ref.current?.updateScreenshot(), []);

  useEffect(() => {
    // initial capture after paint
    const t = setTimeout(updateShot, 50);

    // throttle resize/scroll to keep screenshot current when layout changes
    let ticking = false;
    const schedule = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => { updateShot(); ticking = false; });
      }
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
    };
  }, [updateShot]);

  // DOM wrapper (keeps SEO/a11y)
  const wrapperStyle = {
    position: "relative",
    width: "min(92vw, 900px)",
    margin: "6rem auto",
    borderRadius: `${radiusPx}px`,
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,.20)"
  };

  // True Apple-y glass on top of Specy via CSS backdrop-filter
  const domGlassStyle = {
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    background: "rgba(255,255,255,.08)",
    backdropFilter: `blur(${blur}px) saturate(${saturation})`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation})`,
    border: `1px solid ${borderColor}`,
    boxShadow: [
      innerHighlight ? "inset 0 1px 0 rgba(255,255,255,.35)" : "",
      "0 0 0 transparent"
    ].join(","),
    pointerEvents: "none"
  };

  // Subtle specular sweep (scaled by specularIntensity)
  const sheenStyle = {
    content: '""',
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    background:
      "linear-gradient(120deg, transparent 30%, rgba(255,255,255,.18) 45%, transparent 60%)",
    opacity: specularIntensity,
    transform: "translateX(-40%)",
    transition: "opacity .5s ease, transform .9s ease",
    pointerEvents: "none",
    mixBlendMode: "screen"
  };

  // Micro-noise to sell material (like Apple)
  const noiseStyle = {
    content: '""',
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    backgroundImage:
      "url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAI0lEQVQoU2NkYGD4z0AEMDHgGJgYGBgWw4g1gGJgQkQxGAAAw9kHj1Xw0mUAAAAASUVORK5CYII=\")",
    opacity: 0.5,
    mixBlendMode: "soft-light",
    pointerEvents: "none"
  };

  return (
    <div
      style={wrapperStyle}
      onMouseEnter={(e)=>{ const s=e.currentTarget.querySelector(".sheen"); if(s){s.style.transform="translateX(30%)";} }}
      onMouseLeave={(e)=>{ const s=e.currentTarget.querySelector(".sheen"); if(s){s.style.transform="translateX(-40%)";} }}
    >
      {/* Specy renders refractive glass from a screenshot of targetElement */}
      <LiquidGlass
        ref={ref}
        glassStyle={glassStyle}
        targetElement={typeof document !== "undefined" ? document.querySelector(target) : null}
        wrapperStyle={{ position: "relative", width: "100%", height: "100%", borderRadius: "inherit" }}
        style={``}
      >
        {/* Real DOM content over the effect (SEO/a11y intact) */}
        <div style={{ position:"relative", zIndex:2, padding:"24px 28px", color:"rgba(255,255,255,.95)" }}>
          <h3 style={{margin:"0 0 6px"}}>Liquid Glass</h3>
          <p style={{margin:0, color:"rgba(255,255,255,.82)"}}>
            True live page blur + Specy refraction; Flutter-style controls on top.
          </p>
        </div>
      </LiquidGlass>

      {/* DOM glass "finish": real blur + rim + highlight + noise */}
      <div style={domGlassStyle} aria-hidden="true" />
      <div className="sheen" style={sheenStyle} aria-hidden="true" />
      <div style={noiseStyle} aria-hidden="true" />
    </div>
  );
}