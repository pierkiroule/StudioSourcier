import { Field } from "@sourciers/design-system";
import type { Block } from "@sourciers/studio-tools";
export const blockLabels: Record<Block["kind"], string> = {
  title: "Titre",
  animation: "Ondographe",
  invitation: "Invitation",
  seasons: "Saisons",
  audio: "Audio",
  everyday: "Au quotidien",
  text: "Texte libre",
  image: "Image",
};
export function TextField({
  label,
  value,
  onChange,
  maxLength = 4000,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        rows={3}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="range-value">
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <output>{value}</output>
      </div>
    </Field>
  );
}
