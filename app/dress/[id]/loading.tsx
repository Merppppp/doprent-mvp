import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      <Skeleton style={{ height: 16, width: 160, marginBottom: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48 }}>
        <Skeleton style={{ aspectRatio: "4/5", width: "100%" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton style={{ height: 12, width: 120 }} />
          <Skeleton style={{ height: 32, width: "75%" }} />
          <Skeleton style={{ height: 24, width: 200 }} />
          <Skeleton style={{ height: 14, width: "100%" }} />
          <Skeleton style={{ height: 14, width: "80%" }} />
          <Skeleton style={{ height: 48, width: "100%", marginTop: 12 }} />
          <Skeleton style={{ height: 48, width: "100%" }} />
        </div>
      </div>
    </div>
  );
}
