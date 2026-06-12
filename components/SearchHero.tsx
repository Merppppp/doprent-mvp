"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchHero() {
  const [q, setQ] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) {
      router.push(`/?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="search-hero-wrap">
      <form className="search-hero-form" onSubmit={handleSubmit} role="search">
        <label htmlFor="sh-input" className="sr-only">
          ค้นหาชุดเช่า
        </label>
        {/* Search icon */}
        <span className="sh-icon" aria-hidden>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          id="sh-input"
          type="search"
          className="sh-input"
          placeholder="ค้นหาชุดเช่า..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="sh-btn">
          ค้นหา
        </button>
      </form>

      <style dangerouslySetInnerHTML={{ __html: SH_CSS }} />
    </div>
  );
}

const SH_CSS = `
.search-hero-wrap{
  width:100%;max-width:660px;margin:0 auto;
  padding:0 16px;
}
.search-hero-form{
  position:relative;display:flex;align-items:center;
  background:var(--bg);
  border:1.5px solid var(--line);
  border-radius:999px;
  box-shadow:0 4px 24px oklch(0.3 0.02 85 / 0.10),0 1px 4px oklch(0.3 0.02 85 / 0.06);
  overflow:hidden;
  transition:box-shadow .2s var(--ease),border-color .2s var(--ease);
}
.search-hero-form:focus-within{
  border-color:var(--accent);
  box-shadow:0 0 0 3px color-mix(in oklch,var(--accent) 18%,transparent),0 6px 28px oklch(0.3 0.02 85 / 0.12);
}
.sh-icon{
  position:absolute;left:18px;color:var(--ink-3);
  display:grid;place-items:center;pointer-events:none;flex-shrink:0;
  transition:color .2s var(--ease);
}
.search-hero-form:focus-within .sh-icon{color:var(--accent)}
.sh-input{
  flex:1;border:none;outline:none;background:transparent;
  padding:16px 16px 16px 46px;
  font-size:16px;color:var(--ink);
  font-family:inherit;
  /* Remove default search clear button in WebKit */
}
.sh-input::placeholder{color:var(--ink-3)}
.sh-input::-webkit-search-cancel-button{-webkit-appearance:none}
.sh-btn{
  flex-shrink:0;margin:5px;
  padding:10px 22px;border-radius:999px;
  background:var(--accent);color:var(--accent-ink);
  border:none;font-size:14px;font-weight:600;cursor:pointer;
  font-family:inherit;letter-spacing:.01em;
  transition:background .2s var(--ease),transform .15s var(--ease);
  white-space:nowrap;
}
.sh-btn:hover{background:var(--accent-2)}
.sh-btn:active{transform:scale(0.97)}
@media(max-width:480px){
  .sh-input{font-size:15px;padding:14px 14px 14px 42px}
  .sh-btn{padding:9px 16px;font-size:13.5px}
}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;
