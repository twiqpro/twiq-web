import { TwiqLogo } from "@/components/TwiqLogo";

import { authCardClass, authSubtitleClass } from "@/components/auth/authStyles";

export { authCardClass };

export function AuthCard(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className={authCardClass}>
      <div className="mb-8 flex justify-center">
        <TwiqLogo />
      </div>
      <h1 className="text-center text-xl font-semibold text-white">
        {props.title}
      </h1>
      {props.subtitle ? (
        <p className={authSubtitleClass}>{props.subtitle}</p>
      ) : null}
      {props.children}
      {props.footer}
    </div>
  );
}
