import { vars } from "@stellaria/nebula-themes/web";

// Logotipo de marca: una vela. Pintado con las vars del degradado de marca del
// tema (docs/07 §3), asi se retine solo y sigue siendo de servidor.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 32 32"
      width={size}
    >
      <defs>
        <linearGradient id="vela-brand" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={vars.gradient.brand.edge} />
          <stop offset="1" stopColor={vars.gradient.brand.tip} />
        </linearGradient>
      </defs>
      <path d="M17 3v19H6C9 15 12 8 17 3z" fill="url(#vela-brand)" />
      <path d="M19 6v16h7c-1-6-3.5-11-7-16z" fill="url(#vela-brand)" opacity="0.7" />
      <path d="M4 25h24l-3 4H7z" fill={vars.color.text.secondary} />
    </svg>
  );
}
