export function SelectedBadge({
  label,
  onRemove,
  removeAria,
}: {
  label: string;
  onRemove: () => void;
  removeAria: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/40 text-[11px] font-medium text-[var(--accent)] whitespace-nowrap">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${removeAria}: ${label}`}
        className="w-4 h-4 flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-150 text-[10px] leading-none font-[inherit]"
      >
        ✕
      </button>
    </span>
  );
}
