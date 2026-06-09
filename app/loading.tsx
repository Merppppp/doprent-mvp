import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="home-revamp">
      {/* ======== BANNER SKELETON ======== */}
      <section style={{ width: "100%", lineHeight: 0 }}>
        <Skeleton
          style={{
            width: "100%",
            minHeight: 420,
            borderRadius: 0,
          }}
        />
      </section>

      {/* ======== OCCASIONS / CATEGORY ROW SKELETON ======== */}
      <section
        style={{
          padding: "22px 0 8px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div className="shell">
          {/* Title + link row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Skeleton style={{ height: 20, width: 120 }} />
            <Skeleton style={{ height: 14, width: 60 }} />
          </div>
          {/* Horizontal pill row */}
          <div style={{ display: "flex", gap: 10, overflow: "hidden", paddingBottom: 14 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0 }}
              >
                <Skeleton style={{ width: 68, height: 54, borderRadius: 10 }} />
                <Skeleton style={{ height: 10, width: 52 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== BROWSE SECTION SKELETON ======== */}
      <section style={{ padding: "28px 0 80px", background: "var(--bg)" }}>
        <div className="shell">
          <div className="browse-grid">
            {/* SIDEBAR */}
            <aside>
              <Skeleton style={{ height: 18, width: "60%", marginBottom: 20 }} />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 30, marginBottom: 12 }} />
              ))}
              <Skeleton style={{ height: 18, width: "60%", marginBottom: 20, marginTop: 8 }} />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 30, marginBottom: 12 }} />
              ))}
            </aside>

            {/* MAIN */}
            <main>
              {/* Results bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Skeleton style={{ height: 16, width: 100 }} />
                <Skeleton style={{ height: 36, width: 140, borderRadius: 8 }} />
              </div>

              {/* Dress grid */}
              <div className="grid-3" style={{ gap: "24px 20px" }}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </main>
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: PULSE_CSS }} />
    </div>
  );
}

/* Shimmer animation for skeleton elements */
const PULSE_CSS = `
@keyframes bc-shimmer {
  0%   { opacity: 0.45; }
  50%  { opacity: 0.75; }
  100% { opacity: 0.45; }
}
[aria-hidden="true"] {
  animation: bc-shimmer 1.6s ease-in-out infinite;
}
`;
