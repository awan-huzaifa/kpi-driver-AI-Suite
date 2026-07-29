export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", minHeight: "100vh", color: "#0D1C2A" }}>
      {children}
    </div>
  );
}
