export default function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: 32, height: 32, border: "3px solid rgba(48,125,192,0.2)", borderTopColor: "#307DC0", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}
