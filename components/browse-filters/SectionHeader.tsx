export function SectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full p-0 border-none bg-transparent cursor-pointer font-[inherit]"
    >
      <span className="text-xs font-bold text-[var(--ink)]">{label}</span>
      <span
        className={`text-[11px] text-[var(--ink-3)] inline-block transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
      >
        ▼
      </span>
    </button>
  );
}
