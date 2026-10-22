"use client";

import React, { useEffect, useRef, useState, useId } from "react";

export type MascotEmotion = "neutral" | "happy" | "angry" | "focused" | "thinking";

interface SoraMascotProps {
  emotion?: MascotEmotion;
  className?: string;
  size?: "sm" | "md" | "lg";
  message?: string;
  showSpeechBubble?: boolean;
}

export function SoraMascot({
  emotion = "neutral",
  className = "",
  size = "lg",
  message,
  showSpeechBubble = true,
}: SoraMascotProps) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, "_");
  const containerRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  // Mouse tracking for eyes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.45; // Visor height center

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(Math.hypot(deltaX, deltaY), 300);
      const maxOffset = size === "sm" ? 6 : size === "md" ? 9 : 12;
      const normalizedDist = (distance / 300) * maxOffset;

      setEyeOffset({
        x: Math.cos(angle) * normalizedDist,
        y: Math.sin(angle) * normalizedDist,
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [size]);

  // Default messages for each emotion if not explicitly provided
  const bubbleText =
    message ||
    (emotion === "angry"
      ? "Oops! Check those fields again."
      : emotion === "happy"
      ? "Looking great! Ready to roll."
      : emotion === "thinking"
      ? "Connecting to SORA core..."
      : emotion === "focused"
      ? "I'm listening..."
      : "Hey there! Ready to study?");

  // Determine size dimensions
  const dims =
    size === "sm"
      ? { width: 140, height: 140 }
      : size === "md"
      ? { width: 200, height: 200 }
      : { width: 280, height: 280 };

  // Colors & Styles based on emotion
  const isAngry = emotion === "angry";
  const isHappy = emotion === "happy";
  const isThinking = emotion === "thinking";

  const eyeColor = isAngry
    ? "#ff3b30"
    : isHappy
    ? "#22c55e"
    : isThinking
    ? "#38bdf8"
    : "#ff9f0a";

  const eyeGlow = isAngry
    ? "drop-shadow(0 0 10px rgba(255, 59, 48, 0.85))"
    : isHappy
    ? "drop-shadow(0 0 10px rgba(34, 197, 94, 0.85))"
    : isThinking
    ? "drop-shadow(0 0 10px rgba(56, 189, 248, 0.85))"
    : "drop-shadow(0 0 12px rgba(255, 159, 10, 0.85))";

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* Dynamic Speech Bubble */}
      {showSpeechBubble && (
        <div
          className={`relative mb-3 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-tight transition-all duration-300 transform shadow-soft border ${
            isAngry
              ? "bg-red-50 text-red-700 border-red-200 animate-bounce"
              : isHappy
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 scale-105"
              : isThinking
              ? "bg-sky-50 text-sky-800 border-sky-200 animate-pulse"
              : "bg-surface text-ink border-line"
          }`}
          style={{ maxWidth: 220, textAlign: "center" }}
        >
          <span>{bubbleText}</span>
          {/* Arrow pointing down */}
          <div
            className={`absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r ${
              isAngry
                ? "bg-red-50 border-red-200"
                : isHappy
                ? "bg-emerald-50 border-emerald-200"
                : isThinking
                ? "bg-sky-50 border-sky-200"
                : "bg-surface border-line"
            }`}
          />
        </div>
      )}

      {/* Robot Body Container with floating animation */}
      <div
        className={`relative transition-transform duration-300 ${
          isAngry
            ? "animate-[shake_0.4s_ease-in-out_infinite]"
            : isHappy
            ? "animate-[bounce_2s_ease-in-out_infinite]"
            : "animate-[float_4s_ease-in-out_infinite]"
        }`}
        style={{ width: dims.width, height: dims.height }}
      >
        <svg
          viewBox="0 0 320 320"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label="SORA Robot Mascot"
        >
          <defs>
            {/* White lacquered ceramic head gradient */}
            <linearGradient id={`${uid}-headGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f3f4f6" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>

            {/* Glossy top highlight */}
            <linearGradient id={`${uid}-topGlare`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Bronze/Rose Gold metallic gradient for ears */}
            <linearGradient id={`${uid}-bronzeGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#df9467" />
              <stop offset="40%" stopColor="#b36c42" />
              <stop offset="80%" stopColor="#d78d60" />
              <stop offset="100%" stopColor="#7a4224" />
            </linearGradient>

            {/* Bronze core inner circle */}
            <radialGradient id={`${uid}-bronzeCore`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f7c5a0" />
              <stop offset="70%" stopColor="#b36c42" />
              <stop offset="100%" stopColor="#633216" />
            </radialGradient>

            {/* Visor deep glossy glass */}
            <radialGradient id={`${uid}-visorGlass`} cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#1e2229" />
              <stop offset="60%" stopColor="#111317" />
              <stop offset="100%" stopColor="#08090b" />
            </radialGradient>

            {/* Visor reflective glare curved */}
            <linearGradient id={`${uid}-visorGlare`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Eye LED radial gradients */}
            <radialGradient id={`${uid}-eyeAmber`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor={eyeColor} />
              <stop offset="80%" stopColor={eyeColor} stopOpacity="0.7" />
              <stop offset="100%" stopColor={eyeColor} stopOpacity="0" />
            </radialGradient>

            {/* Drop shadow filter for head & ears */}
            <filter id={`${uid}-botShadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#111318" floodOpacity="0.16" />
            </filter>
          </defs>

          {/* Floating Shadow Under Robot */}
          <ellipse
            cx="160"
            cy="305"
            rx={isHappy ? 55 : 65}
            ry="10"
            fill="#111318"
            fillOpacity="0.12"
            className="transition-all duration-300"
          />

          {/* Lower Neck / Body Capsule Base */}
          <g filter={`url(#${uid}-botShadow)`}>
            <path
              d="M100 230 C100 220 220 220 220 230 C225 260 215 285 160 285 C105 285 95 260 100 230 Z"
              fill={`url(#${uid}-headGrad)`}
              stroke="#d1d5db"
              strokeWidth="2"
            />
            {/* Neck Collar groove */}
            <path
              d="M115 235 C130 242 190 242 205 235"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Chest SORA Logo Mark accent */}
            <circle cx="160" cy="260" r="6" fill="#b36c42" />
            <circle cx="160" cy="260" r="3" fill="#ffffff" />
          </g>

          {/* Left Bronze Ear Pivot */}
          <g>
            {/* Outrigger mount */}
            <rect x="24" y="130" width="28" height="42" rx="10" fill={`url(#${uid}-bronzeGrad)`} />
            {/* Main ear cylinder */}
            <circle cx="36" cy="151" r="24" fill={`url(#${uid}-bronzeGrad)`} stroke="#633216" strokeWidth="2" />
            <circle cx="36" cy="151" r="16" fill={`url(#${uid}-bronzeCore)`} />
            <circle cx="36" cy="151" r="8" fill="#df9467" />
            <circle cx="36" cy="151" r="4" fill="#3e1a0b" />
          </g>

          {/* Right Bronze Ear Pivot */}
          <g>
            {/* Outrigger mount */}
            <rect x="268" y="130" width="28" height="42" rx="10" fill={`url(#${uid}-bronzeGrad)`} />
            {/* Main ear cylinder */}
            <circle cx="284" cy="151" r="24" fill={`url(#${uid}-bronzeGrad)`} stroke="#633216" strokeWidth="2" />
            <circle cx="284" cy="151" r="16" fill={`url(#${uid}-bronzeCore)`} />
            <circle cx="284" cy="151" r="8" fill="#df9467" />
            <circle cx="284" cy="151" r="4" fill="#3e1a0b" />
          </g>

          {/* Robot Head Sphere */}
          <g filter={`url(#${uid}-botShadow)`}>
            <ellipse
              cx="160"
              cy="148"
              rx="118"
              ry="112"
              fill={`url(#${uid}-headGrad)`}
              stroke="#d1d5db"
              strokeWidth="2"
            />

            {/* Top Gloss Highlight */}
            <path
              d="M80 85 C105 52 215 52 240 85 C200 68 120 68 80 85 Z"
              fill={`url(#${uid}-topGlare)`}
            />

            {/* Small Antenna Crest Groove */}
            <rect x="156" y="36" width="8" height="12" rx="4" fill="#d1d5db" />
            <circle cx="160" cy="34" r="5" fill="#b36c42" />

            {/* Visor Bezel (Dark Border) */}
            <rect
              x="62"
              y="94"
              width="196"
              height="108"
              rx="54"
              fill="#0b0d10"
              stroke="#2c3039"
              strokeWidth="3"
            />

            {/* Visor Dark Glass Interior */}
            <rect
              x="65"
              y="97"
              width="190"
              height="102"
              rx="51"
              fill={`url(#${uid}-visorGlass)`}
            />

            {/* Visor Curved Reflection Accent */}
            <path
              d="M75 125 C100 105 210 105 245 125 C220 115 110 115 75 125 Z"
              fill={`url(#${uid}-visorGlare)`}
            />
          </g>

          {/* EYES DISPLAY GROUP (Tracks cursor & changes shapes) */}
          <g
            style={{
              transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
              transition: "transform 0.08s ease-out",
              filter: eyeGlow,
            }}
          >
            {/* ANGRY STATE: Slanted sharp glowing bars with red tone */}
            {isAngry && (
              <g>
                {/* Left angry eye: angled downward inward */}
                <path
                  d="M102 136 L138 152"
                  stroke={eyeColor}
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <circle cx="120" cy="144" r="4" fill="#ffffff" />
                {/* Left brow mark */}
                <path
                  d="M98 126 L140 144"
                  stroke="#ef4444"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Right angry eye: angled downward inward */}
                <path
                  d="M218 136 L182 152"
                  stroke={eyeColor}
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <circle cx="200" cy="144" r="4" fill="#ffffff" />
                {/* Right brow mark */}
                <path
                  d="M222 126 L180 144"
                  stroke="#ef4444"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Small angry alert symbol between eyes */}
                <circle cx="160" cy="130" r="3" fill="#ff3b30" />
              </g>
            )}

            {/* HAPPY STATE: Joyful upward arched crescents ^ ^ */}
            {isHappy && (
              <g>
                {/* Left happy eye arch */}
                <path
                  d="M102 154 C104 134 136 134 138 154"
                  fill="none"
                  stroke={eyeColor}
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                {/* Right happy eye arch */}
                <path
                  d="M182 154 C184 134 216 134 218 154"
                  fill="none"
                  stroke={eyeColor}
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                {/* Cute blushing cheeks */}
                <circle cx="95" cy="165" r="7" fill="#ff6b81" fillOpacity="0.4" />
                <circle cx="225" cy="165" r="7" fill="#ff6b81" fillOpacity="0.4" />
              </g>
            )}

            {/* THINKING STATE: Rotating or pulsing radar arcs */}
            {isThinking && (
              <g>
                <circle
                  cx="120"
                  cy="148"
                  r="16"
                  fill="none"
                  stroke={eyeColor}
                  strokeWidth="5"
                  strokeDasharray="18 10"
                  className="animate-spin"
                  style={{ transformOrigin: "120px 148px" }}
                />
                <circle cx="120" cy="148" r="5" fill="#ffffff" />

                <circle
                  cx="200"
                  cy="148"
                  r="16"
                  fill="none"
                  stroke={eyeColor}
                  strokeWidth="5"
                  strokeDasharray="18 10"
                  className="animate-spin"
                  style={{ transformOrigin: "200px 148px" }}
                />
                <circle cx="200" cy="148" r="5" fill="#ffffff" />
              </g>
            )}

            {/* NEUTRAL / FOCUSED STATE: Luminous LED rings matching robbb.jpg */}
            {!isAngry && !isHappy && !isThinking && (
              <g>
                {/* Left Eye: outer glowing ring + bright pupil dot */}
                <circle
                  cx="120"
                  cy="148"
                  r={emotion === "focused" ? "19" : "17"}
                  fill="none"
                  stroke={eyeColor}
                  strokeWidth={emotion === "focused" ? "6" : "5"}
                />
                <circle cx="120" cy="148" r="7" fill={`url(#${uid}-eyeAmber)`} />
                <circle cx="120" cy="148" r="3.5" fill="#ffffff" />
                <circle cx="124" cy="144" r="1.5" fill="#ffffff" />

                {/* Right Eye: outer glowing ring + bright pupil dot */}
                <circle
                  cx="200"
                  cy="148"
                  r={emotion === "focused" ? "19" : "17"}
                  fill="none"
                  stroke={eyeColor}
                  strokeWidth={emotion === "focused" ? "6" : "5"}
                />
                <circle cx="200" cy="148" r="7" fill={`url(#${uid}-eyeAmber)`} />
                <circle cx="200" cy="148" r="3.5" fill="#ffffff" />
                <circle cx="204" cy="144" r="1.5" fill="#ffffff" />
              </g>
            )}
          </g>

          {/* Visor Glare overlay on top of eyes for authentic glassy depth */}
          <ellipse
            cx="160"
            cy="110"
            rx="75"
            ry="9"
            fill="#ffffff"
            fillOpacity="0.07"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(1deg);
          }
        }
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0px) rotate(0deg);
          }
          20% {
            transform: translateX(-4px) rotate(-2deg);
          }
          40% {
            transform: translateX(4px) rotate(2deg);
          }
          60% {
            transform: translateX(-3px) rotate(-1deg);
          }
          80% {
            transform: translateX(3px) rotate(1deg);
          }
        }
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px) scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}
