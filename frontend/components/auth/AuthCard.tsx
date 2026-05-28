import { TwiqLogo } from "@/components/TwiqLogo";

export function AuthCard(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-[8px] border border-white/10 bg-[#121212] p-8 shadow-2xl">
      <div className="mb-8 flex justify-center">
        <TwiqLogo />
      </div>
      <h1 className="text-center text-xl font-semibold text-white/95">
        {props.title}
      </h1>
      {props.subtitle ? (
        <p className="mt-2 text-center text-sm text-white/60">{props.subtitle}</p>
      ) : null}
      {props.children}
      {props.footer}
    </div>
  );
}
