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
      <label htmlFor={props.id} className="mb-1.5 block text-xs text-white/65">
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type}
        autoComplete={props.autoComplete}
        required={props.required ?? true}
        minLength={props.minLength}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none ring-[#b5004e]/40 focus:border-[#b5004e]/60 focus:ring-2"
        placeholder={props.placeholder}
      />
    </div>
  );
}
