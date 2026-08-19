'use client';

import { useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { ACCEPTED_MIME, CONFIG } from '@/lib/config';
import { cn } from '@/lib/utils/cn';

const ACCEPT_ATTR = ACCEPTED_MIME.join(',');

/** Client-side validation, so an obvious mistake never costs a round trip. */
function validate(file: File): string | null {
  const mime = file.type.split(';')[0].trim().toLowerCase();

  if (mime && !(ACCEPTED_MIME as readonly string[]).includes(mime)) {
    return `We can read PDFs and photos (JPG, PNG, WebP). That one is ${mime}.`;
  }
  if (!mime && !/\.(pdf|png|jpe?g|webp)$/i.test(file.name)) {
    return 'We can read PDFs and photos (JPG, PNG, WebP).';
  }
  if (file.size > CONFIG.limits.maxFileBytes) {
    return `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB and the limit is 10 MB.`;
  }
  if (file.size === 0) {
    return 'That file is empty. Check it opens on your device first.';
  }
  return null;
}

export function DropZone({
  onFile,
  disabled = false,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (file: File | undefined): void => {
    if (!file) return;
    const problem = validate(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files[0]);
  };

  return (
    <div>
      {/* A real label + input: the whole area is the control, and the browser's
          own keyboard and screen-reader behaviour comes for free. */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <label
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[2px] border border-dashed px-6 py-9 text-center transition-colors duration-[120ms]',
            'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--registrar)]',
            dragging
              ? 'border-[var(--registrar)] bg-[color-mix(in_srgb,var(--registrar)_5%,var(--surface))]'
              : 'border-[var(--rule)] bg-[var(--surface)] hover:border-[var(--registrar)]',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            disabled={disabled}
            className="sr-only"
            onChange={(event) => {
              accept(event.target.files?.[0]);
              // Allow re-selecting the same file after an error.
              event.target.value = '';
            }}
          />
          <Upload
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className="text-[var(--registrar)]"
          />
          <span className="text-17 font-medium text-[var(--ink)]">
            Drop your agreement here
          </span>
          <span className="u-mono text-[var(--ink-soft)]">
            PDF, or photos of the pages · up to 10 MB · nothing is stored
          </span>
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-2.5 flex items-start gap-2 text-13 text-[var(--flag-high)]"
        >
          <span
            aria-hidden
            className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-[1px] bg-[var(--flag-high)]"
          />
          {error}
        </p>
      ) : null}
    </div>
  );
}
