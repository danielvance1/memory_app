import { useId, type InputHTMLAttributes } from "react";
import { inputField } from "./ui";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** A short hint shown under the field until there is an error. */
  hint?: string;
  error?: string;
}

// A labelled text input with an optional hint and error message.
export function TextField({ label, hint, error, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`${inputField} ${error ? "border-rose-500" : "border-slate-600 focus:border-indigo-400"}`}
        {...inputProps}
      />
      {error ? (
        <p id={messageId} role="alert" className="mt-1.5 text-sm text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// A message about the form as a whole (as opposed to one field).
export function FormError({ children }: { children: string }) {
  return (
    <p role="alert" className="rounded-xl bg-rose-950/70 px-4 py-3 text-sm text-rose-200">
      {children}
    </p>
  );
}
