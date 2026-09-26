import StatCounter from "./StatCounter";

// Orbit Ring Container
function OrbitRing({ size, duration, direction, children }) {
  const spinClass = direction === "left" ? "spin-reverse" : "spin-forward";
  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 orbit-border z-0"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ animation: `${spinClass} ${duration}s linear infinite` }}
      >
        {children}
      </div>
    </div>
  );
}

// Orbit Avatar Node (counter-rotates so face stays upright)
function OrbitAvatar({
  orbitDirection,
  orbitDuration,
  angle,
  size = 58,
  img,
  glow = "shadow-[0_0_20px_rgba(160,104,255,0.6)]",
  delay = 0.6,
  rounded = "rounded-full",
}) {
  const rad = (angle * Math.PI) / 180;
  const left = `calc(50% + ${50 * Math.cos(rad)}%)`;
  const top = `calc(50% + ${50 * Math.sin(rad)}%)`;
  const counterSpinClass = orbitDirection === "left" ? "spin-forward" : "spin-reverse";

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left, top, width: size, height: size }}
    >
      <div
        className="w-full h-full"
        style={{ animation: `${counterSpinClass} ${orbitDuration}s linear infinite` }}
      >
        <div
          className={`w-full h-full opacity-0 animate-[avatar-fly-in_0.8s_cubic-bezier(0.22,1,0.36,1)_forwards] ${rounded} ${glow} overflow-hidden border border-white/10 bg-[#060218]`}
          style={{ animationDelay: `${delay}s` }}
        >
          <img
            src={img}
            alt="Cadre Officer"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

// Orbit Tech Chip (counter-rotates so icon stays upright)
function OrbitTechChip({
  orbitDirection,
  orbitDuration,
  angle,
  size = 50,
  glow = "shadow-[0_0_15px_rgba(255,255,255,0.1)]",
  delay = 0.8,
  rounded = "rounded-xl",
  icon,
  label,
  invert = false,
}) {
  const rad = (angle * Math.PI) / 180;
  const left = `calc(50% + ${50 * Math.cos(rad)}%)`;
  const top = `calc(50% + ${50 * Math.sin(rad)}%)`;
  const counterSpinClass = orbitDirection === "left" ? "spin-forward" : "spin-reverse";

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left, top, width: size, height: size }}
    >
      <div
        className="w-full h-full"
        style={{ animation: `${counterSpinClass} ${orbitDuration}s linear infinite` }}
      >
        <div
          className={`w-full h-full opacity-0 animate-[avatar-fly-in_0.8s_cubic-bezier(0.22,1,0.36,1)_forwards] flex items-center justify-center bg-[#0d0726] border border-white/10 ${rounded} ${glow}`}
          style={{ animationDelay: `${delay}s` }}
          title={label}
        >
          <img
            src={icon}
            alt={label}
            className={`w-[60%] h-[60%] object-contain ${invert ? "invert" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}

export default function OrbitCluster() {
  return (
    <div className="hero-circles-wrapper z-10 scale-in" style={{ animationDelay: "0.3s" }}>
      <div className="hero-circles-responsive">
        <div className="hero-circles">
          {/* Ring 1 (300px dia, 20s spin-reverse) */}
          <OrbitRing size={300} duration={20} direction="left">
            <OrbitAvatar
              orbitDirection="left"
              orbitDuration={20}
              angle={270}
              size={58}
              img="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
              glow="shadow-[0_0_20px_rgba(160,104,255,0.6)]"
              delay={0.6}
              rounded="rounded-[20px]"
            />
            <OrbitTechChip
              orbitDirection="left"
              orbitDuration={20}
              angle={90}
              size={48}
              delay={0.8}
              icon="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"
              label="Python Statistical Modeling"
            />
          </OrbitRing>

          {/* Ring 2 (450px dia, 35s spin-forward) */}
          <OrbitRing size={450} duration={35} direction="right">
            <OrbitAvatar
              orbitDirection="right"
              orbitDuration={35}
              angle={60}
              size={58}
              img="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80"
              glow="shadow-[0_0_20px_rgba(255,215,0,0.6)]"
              delay={0.9}
              rounded="rounded-full"
            />
            <OrbitTechChip
              orbitDirection="right"
              orbitDuration={35}
              angle={150}
              size={50}
              delay={1.1}
              icon="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/r/r-original.svg"
              label="R Statistical Language"
            />
            <OrbitAvatar
              orbitDirection="right"
              orbitDuration={35}
              angle={240}
              size={78}
              img="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80"
              glow="shadow-[0_0_20px_rgba(255,105,180,0.6)]"
              delay={1.2}
              rounded="rounded-full"
            />
            <OrbitTechChip
              orbitDirection="right"
              orbitDuration={35}
              angle={330}
              size={45}
              delay={1.3}
              icon="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg"
              label="PostgreSQL / Supabase Cadre DB"
            />
          </OrbitRing>

          {/* Ring 3 (600px dia, 45s spin-reverse) */}
          <OrbitRing size={600} duration={45} direction="left">
            <OrbitAvatar
              orbitDirection="left"
              orbitDuration={45}
              angle={130}
              size={88}
              img="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80"
              glow="shadow-[0_0_20px_rgba(255,105,180,0.6)]"
              delay={1.4}
              rounded="rounded-full"
            />
            <OrbitTechChip
              orbitDirection="left"
              orbitDuration={45}
              angle={40}
              size={55}
              delay={1.5}
              icon="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg"
              label="PyTorch ML Diagnostic Engine"
            />
            <OrbitAvatar
              orbitDirection="left"
              orbitDuration={45}
              angle={280}
              size={58}
              img="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80"
              glow="shadow-[0_0_20px_rgba(160,104,255,0.6)]"
              delay={1.6}
              rounded="rounded-full"
            />
          </OrbitRing>

          {/* Ring 4 (750px dia, 55s spin-forward) */}
          <OrbitRing size={750} duration={55} direction="right">
            <OrbitAvatar
              orbitDirection="right"
              orbitDuration={55}
              angle={30}
              size={58}
              img="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80"
              glow="shadow-[0_0_20px_rgba(0,191,255,0.6)]"
              delay={1.7}
              rounded="rounded-[20px]"
            />
            <OrbitTechChip
              orbitDirection="right"
              orbitDuration={55}
              angle={95}
              size={50}
              delay={1.8}
              icon="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg"
              label="React 19 Interactive Passbook"
            />
            <OrbitAvatar
              orbitDirection="right"
              orbitDuration={55}
              angle={170}
              size={88}
              img="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80"
              glow="shadow-[0_0_20px_rgba(255,165,0,0.6)]"
              delay={1.9}
              rounded="rounded-[24px]"
            />
            <OrbitAvatar
              orbitDirection="right"
              orbitDuration={55}
              angle={240}
              size={88}
              img="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80"
              glow="shadow-[0_0_20px_rgba(255,105,180,0.6)]"
              delay={2.0}
              rounded="rounded-[24px]"
            />
            <OrbitTechChip
              orbitDirection="right"
              orbitDuration={55}
              angle={300}
              size={45}
              delay={2.1}
              icon="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg"
              label="FastAPI High-Speed RAG Pipeline"
            />
          </OrbitRing>

          {/* Center Stat Counter */}
          <StatCounter target={28} suffix="k+" label="Competency Profiles" delay={1200} />
        </div>
      </div>
    </div>
  );
}
