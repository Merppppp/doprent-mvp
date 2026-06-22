import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <LoadingBar />
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
    </>
  );
}
