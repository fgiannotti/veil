"use client";

type MonthInputProps = {
  id: string;
  value: string;
  min: string;
  max: string;
  required?: boolean;
  onChange: (value: string) => void;
};

/** `type="month"` that opens the native picker on click anywhere in the field. */
export function MonthInput({ id, value, min, max, required, onChange }: MonthInputProps) {
  return (
    <input
      id={id}
      type="month"
      className="input cursor-pointer"
      lang="es-AR"
      value={value}
      min={min}
      max={max}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => {
        const el = e.currentTarget;
        if (typeof el.showPicker === "function") {
          try {
            el.showPicker();
          } catch {
            // showPicker can throw if the input is not user-activated in some browsers
          }
        }
      }}
    />
  );
}
