"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import {
  authIconButtonClass,
  authPasswordInputClass,
} from "@/components/auth/authStyles";

export function AuthPasswordInput(props: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={props.id}
        type={visible ? "text" : "password"}
        autoComplete={props.autoComplete}
        required={props.required ?? true}
        minLength={props.minLength}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className={authPasswordInputClass}
        placeholder={props.placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${authIconButtonClass}`}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeSlashIcon className="h-5 w-5" aria-hidden />
        ) : (
          <EyeIcon className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
