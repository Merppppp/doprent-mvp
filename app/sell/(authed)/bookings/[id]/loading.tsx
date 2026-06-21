import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ padding: "28px 24px", maxWidth: 560 }}>
      <LoadingBar />
      <Skeleton style={{ height: 14, width: 140, marginBottom: 14 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <Skeleton style={{ height: 24, width: "50%" }} />
        <Skeleton style={{ height: 24, width: 80, borderRadius: 999 }} />
      </div>
      <Skeleton style={{ height: 14, width: "60%", marginBottom: 20 }} />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <Skeleton style={{ height: 14, width: "30%" }} />
              <Skeleton style={{ height: 14, width: "40%" }} />
            </div>
          ))}
        </div>
      ))}
      <Skeleton style={{ height: 48, borderRadius: 8, marginBottom: 12 }} />
    </div>
  );
}
