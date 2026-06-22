export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded-full text-[11px] cursor-pointer font-[inherit] transition-all duration-150 whitespace-nowrap text-center border ${
        active
          ? "bg-[var(--accent)] text-white font-semibold border-[var(--accent)]"
          : "bg-[var(--surface)] text-[var(--ink-2)] font-normal border-[var(--line)]"
      }`}
    >
      {label}
    </button>
  );
}
