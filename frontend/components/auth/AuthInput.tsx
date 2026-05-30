"use client";

import { authInputClass, authLabelClass } from "@/components/auth/authStyles";
import { AuthPasswordInput } from "@/components/auth/AuthPasswordInput";

export function AuthInput(props: {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={props.id} className={authLabelClass}>
        {props.label}
      </label>
      {props.type === "password" ? (
        <AuthPasswordInput
          id={props.id}
          autoComplete={props.autoComplete}
          required={props.required}
          minLength={props.minLength}
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
        />
      ) : (
        <input
          id={props.id}
          type={props.type}
          autoComplete={props.autoComplete}
          required={props.required ?? true}
          minLength={props.minLength}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className={authInputClass}
          placeholder={props.placeholder}
        />
      )}
    </div>
  );
}
