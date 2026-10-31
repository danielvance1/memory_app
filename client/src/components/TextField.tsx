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
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`${inputField} ${error ? "border-danger" : "border-line-strong focus:border-brand"}`}
        {...inputProps}
      />
      {error ? (
        <p id={messageId} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// A message about the form as a whole (as opposed to one field).
export function FormError({ children }: { children: string }) {
  return (
    <p role="alert" className=" bg-danger/15 px-4 py-3 text-sm text-danger">
      {children}
    </p>
  );
}
