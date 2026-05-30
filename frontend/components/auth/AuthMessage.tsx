export function AuthMessage(props: {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    error: "border border-rose-800 bg-rose-950 text-rose-200",
    success: "border border-emerald-800 bg-emerald-950 text-emerald-200",
    info: "border border-neutral-700 bg-neutral-900 text-neutral-200",
  };

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${styles[props.tone]}`}
      role={props.tone === "error" ? "alert" : "status"}
    >
      {props.children}
    </p>
  );
}
