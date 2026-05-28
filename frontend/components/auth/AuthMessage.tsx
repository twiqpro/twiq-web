export function AuthMessage(props: {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    error: "bg-rose-500/10 text-rose-300",
    success: "bg-emerald-500/10 text-emerald-300",
    info: "bg-white/5 text-white/70",
  };

  return (
    <p
      className={`rounded-md px-3 py-2 text-sm ${styles[props.tone]}`}
      role={props.tone === "error" ? "alert" : "status"}
    >
      {props.children}
    </p>
  );
}
