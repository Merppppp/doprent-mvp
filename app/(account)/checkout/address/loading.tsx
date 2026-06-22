import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ maxWidth: 560, padding: "36px 20px 80px" }}>
      <LoadingBar />
      <Skeleton style={{ height: 24, width: 200, marginBottom: 20 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <Skeleton style={{ height: 13, width: 100, marginBottom: 6 }} />
          <Skeleton style={{ height: 44, borderRadius: 8 }} />
        </div>
      ))}
      <Skeleton style={{ height: 48, borderRadius: 8, marginTop: 10 }} />
    </div>
  );
}
