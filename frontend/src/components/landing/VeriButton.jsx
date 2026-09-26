import { Link } from "react-router-dom";

export default function VeriButton({
  children,
  className = "",
  onClick,
  href,
  to,
  slideFrom = "left",
}) {
  const content = (
    <>
      <div
        className={`absolute inset-0 bg-[#A068FF] ${
          slideFrom === "left"
            ? "-translate-x-full group-hover:translate-x-0"
            : "translate-x-full group-hover:translate-x-0"
        } transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] z-0`}
      />
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </>
  );

  const wrapperClasses =
    "relative inline-flex rounded-[50px] p-[3px] overflow-hidden group btn-border-wrap cursor-pointer";
  const innerClasses = `relative z-10 bg-[#060218] text-white rounded-[50px] overflow-hidden flex items-center justify-center transition-colors ${className}`;

  return (
    <div className={wrapperClasses} style={{ "--border-angle": "0deg" }}>
      <div className="absolute inset-0 z-0 bg-[conic-gradient(from_var(--border-angle),#A068FF,#070319,#A068FF,#070319,#A068FF)] animate-[rotate-border_3s_linear_infinite]" />
      {to ? (
        <Link to={to} onClick={onClick} className={innerClasses}>
          {content}
        </Link>
      ) : href ? (
        <a href={href} onClick={onClick} className={innerClasses}>
          {content}
        </a>
      ) : (
        <button type="button" onClick={onClick} className={innerClasses}>
          {content}
        </button>
      )}
    </div>
  );
}
