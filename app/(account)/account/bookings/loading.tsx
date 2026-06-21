import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <LoadingBar />
      <Skeleton style={{ height: 22, width: 180, marginBottom: 20 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <Skeleton style={{ height: 16, width: "50%" }} />
            <Skeleton style={{ height: 22, width: 70, borderRadius: 999 }} />
          </div>
          <Skeleton style={{ height: 13, width: "70%", marginBottom: 6 }} />
          <Skeleton style={{ height: 13, width: "40%" }} />
        </div>
      ))}
    </>
  );
}
