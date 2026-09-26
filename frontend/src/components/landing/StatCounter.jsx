import { useState, useEffect } from "react";

export default function StatCounter({
  target = 28,
  suffix = "k+",
  label = "Competency Profiles",
  duration = 2000,
  delay = 1200,
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let animationFrameId;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Cubic ease-out: 1 - (1 - progress)^3
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easedProgress * target));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(animate);
      }
    };

    const timer = setTimeout(() => {
      animationFrameId = window.requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [target, duration, delay]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 flex flex-col items-center justify-center pointer-events-none select-none">
      <div
        className="flex flex-col items-center justify-center opacity-0 animate-[fadeUp_0.8s_cubic-bezier(0.22,1,0.36,1)_forwards]"
        style={{ animationDelay: `${delay / 1000}s` }}
      >
        <div className="font-urbanist text-[56px] sm:text-[64px] font-medium leading-none tracking-tight text-white drop-shadow-2xl">
          {count}{suffix}
        </div>
        <div className="font-urbanist text-[13px] sm:text-[15px] font-semibold tracking-wide text-[#A068FF] uppercase mt-1 text-center whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}
