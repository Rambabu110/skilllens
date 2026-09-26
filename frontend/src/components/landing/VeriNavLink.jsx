export default function VeriNavLink({ children, href, onClick, className = "" }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`relative group text-white text-[15px] font-medium transition-colors cursor-pointer ${className}`}
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-white scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out" />
    </a>
  );
}
