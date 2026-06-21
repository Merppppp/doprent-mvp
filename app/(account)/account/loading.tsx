import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ padding: "28px 0 80px" }}>
      <LoadingBar />
      <div className="account-grid">
        <aside className="account-sidebar">
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 18, marginBottom: 12 }}>
            <Skeleton style={{ width: 48, height: 48, borderRadius: 999, marginBottom: 10 }} />
            <Skeleton style={{ height: 16, width: "70%", marginBottom: 6 }} />
            <Skeleton style={{ height: 12, width: "90%" }} />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 38, marginBottom: 4, borderRadius: 6 }} />
          ))}
        </aside>
        <main>
          <Skeleton style={{ height: 22, width: 180, marginBottom: 20 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton style={{ aspectRatio: "3/4", width: "100%", marginBottom: 10 }} />
                <Skeleton style={{ height: 12, width: "60%", marginBottom: 6 }} />
                <Skeleton style={{ height: 14, width: "80%" }} />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
