"use client";
import { useState } from "react";

type Props = {
  name?: string;
  defaultValue?: number;
  onChange?: (v: number) => void;
};

export default function StarRatingInput({ name = "rating", defaultValue = 0, onChange }: Props) {
  const [hover, setHover] = useState(0);
  const [value, setValue] = useState(defaultValue);

  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          aria-label={`${s} ดาว`}
          onClick={() => { setValue(s); onChange?.(s); }}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            fontSize: 28,
            color: s <= (hover || value) ? "var(--gold)" : "var(--line)",
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
      <input type="hidden" name={name} value={value} />
    </span>
  );
}
