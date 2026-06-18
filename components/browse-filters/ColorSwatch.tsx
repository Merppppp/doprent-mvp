export function ColorSwatch({
  value,
  label,
  hex,
  active,
  onClick,
}: {
  value: string;
  label: string;
  hex: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md cursor-pointer font-[inherit] transition-all duration-150 ${
        active
          ? "border border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border border-[var(--line)] bg-[var(--surface)]"
      }`}
    >
      <span
        className="w-3.5 h-3.5 rounded-full shrink-0 inline-block"
        style={{
          background: hex,
          border: hex === "#FFFFFF" || hex === "#FFFDD0" ? "1px solid var(--line)" : "none",
        }}
      />
      <span className={`text-[11px] ${active ? "text-[var(--accent)] font-semibold" : "text-[var(--ink-2)] font-normal"}`}>
        {label}
      </span>
    </button>
  );
}
