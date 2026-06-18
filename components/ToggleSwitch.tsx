"use client";

import { useRef } from "react";

export interface ToggleSwitchProps {
  /** Current on/off state */
  checked: boolean;
  /** Hidden input name — used when the toggle is inside a <form> with a server action */
  name?: string;
  /** Accessible label describing what the switch controls */
  label?: string;
  /**
   * When provided the switch is "controlled" — it calls onChange with the
   * next boolean and does NOT auto-submit its parent form.
   * When omitted the switch auto-submits its parent form on change (server-
   * action form pattern).
   */
  onChange?: (checked: boolean) => void;
  /** Extra inline style on the outermost element */
  style?: React.CSSProperties;
}

/**
 * iOS-style sliding toggle switch.
 *
 * Two usage modes:
 *
 * 1. **Server-action form** — omit `onChange`. The component wraps a hidden
 *    checkbox and calls `form.requestSubmit()` on every toggle:
 *    ```tsx
 *    <form action={myAction.bind(null, id)}>
 *      <ToggleSwitch checked={value} name="enabled" />
 *    </form>
 *    ```
 *
 * 2. **Controlled** — pass `onChange`. The component calls back with the next
 *    value and never touches the form:
 *    ```tsx
 *    <ToggleSwitch checked={val} onChange={setVal} />
 *    ```
 */
export default function ToggleSwitch({
  checked,
  name,
  label,
  onChange,
  style,
}: ToggleSwitchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    const next = !checked;
    if (onChange) {
      onChange(next);
    } else {
      // auto-submit parent form. Resolve the form from the hidden input (when a
      // `name` is set) OR fall back to the button's own form — so the toggle works
      // even as a pure server-action trigger with no `name` (dashboard pattern).
      if (inputRef.current) {
        inputRef.current.checked = next;
      }
      const form = inputRef.current?.form ?? buttonRef.current?.form;
      form?.requestSubmit();
    }
  }

  const trackOn = "var(--accent, #2e9c65)";
  const trackOff = "var(--line, #d1d5db)";

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        ...style,
      }}
    >
      {/* Hidden checkbox keeps form serialization correct */}
      {name ? (
        <input
          ref={inputRef}
          type="checkbox"
          name={name}
          defaultChecked={checked}
          aria-hidden="true"
          style={{ display: "none" }}
        />
      ) : null}

      {/* Track */}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: 44,
          height: 26,
          borderRadius: 999,
          background: checked ? trackOn : trackOff,
          transition: "background 0.2s ease",
          flexShrink: 0,
        }}
      >
        {/* Knob */}
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            transition: "left 0.2s ease",
          }}
        />
      </span>
    </button>
  );
}
