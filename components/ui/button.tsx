import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/**
 * Hand-rolled, because the whole product needs three button treatments and a
 * component library would bring its own colour scale into a design where every
 * colour is a token.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--registrar)] text-[var(--surface)] border border-[var(--registrar)] hover:bg-[color-mix(in_srgb,var(--registrar)_88%,black)] active:translate-y-px',
  secondary:
    'bg-[var(--surface)] text-[var(--ink)] border border-[var(--rule)] hover:border-[var(--registrar)] hover:text-[var(--registrar)] active:translate-y-px',
  ghost:
    'bg-transparent text-[var(--ink-soft)] border border-transparent hover:text-[var(--registrar)] hover:border-[var(--rule)]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-13',
  md: 'h-10 px-4 text-15',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[2px] font-medium',
        'transition-colors duration-[120ms] ease-out',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[var(--rule)] disabled:hover:text-[var(--ink)]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
