import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <LoadingBar />
      <Skeleton style={{ height: 28, width: 140, marginBottom: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Skeleton style={{ width: 48, height: 48, borderRadius: 999 }} />
              <div style={{ flex: 1 }}>
                <Skeleton style={{ height: 16, width: "60%", marginBottom: 6 }} />
                <Skeleton style={{ height: 12, width: "40%" }} />
              </div>
            </div>
            <Skeleton style={{ height: 13, width: "80%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
