"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NavbarSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 999,
        overflow: "hidden",
        width: "100%",
        transition: "background .2s, border-color .2s",
      }}
      className="ns-form"
    >
      <label htmlFor="ns-input" className="sr-only">ค้นหาชุดเช่า</label>
      <span style={{ paddingLeft: 14, color: "rgba(255,255,255,0.65)", display: "grid", placeItems: "center", flexShrink: 0 }} aria-hidden>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
        </svg>
      </span>
      <input
        id="ns-input"
        type="search"
        placeholder="ค้นหาชุด..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          padding: "9px 10px",
          fontSize: 13.5,
          color: "#fff",
          fontFamily: "inherit",
          minWidth: 0,
        }}
        className="ns-input"
      />
      <button
        type="submit"
        style={{
          flexShrink: 0,
          margin: 4,
          padding: "6px 14px",
          borderRadius: 999,
          background: "#fff",
          color: "#1B4332",
          border: "none",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        ค้นหา
      </button>
      <style dangerouslySetInnerHTML={{ __html: `
        .ns-form:focus-within { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.4); }
        .ns-input::placeholder { color: rgba(255,255,255,0.5); }
        .ns-input::-webkit-search-cancel-button { -webkit-appearance: none; }
        .sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0 }
      `}} />
    </form>
  );
}
