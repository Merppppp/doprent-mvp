/**
 * RequiredMark — a small red asterisk indicating a mandatory field.
 * Render after the field label text; hidden from screen-readers (the
 * input's aria-required conveys the same information).
 */
export default function RequiredMark() {
  return (
    <span
      aria-hidden="true"
      style={{ color: "var(--danger, #e5484d)", marginLeft: 2 }}
    >
      *
    </span>
  );
}
