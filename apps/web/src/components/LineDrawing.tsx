/** Pen-style empty-state drawing: a magnifier over a sheet of notes (DESIGN_SYSTEM §7). */
export function LineDrawing({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width="120"
      height="120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M26 18.5c14.5-.8 33.2-.6 49.6.3l.4 64.8c-16.6.9-33.8.7-50.4-.2L26 18.5Z" />
      <path d="M35 33.2c9.7-.4 19.6-.3 30.4.1M35 43.1c7.6-.3 14.8-.2 22.1.2M35 53c9.2-.4 18.6-.2 27.6.2" />
      <circle cx="74" cy="72" r="15.5" />
      <path d="M85.3 83.4 99 97.6" />
      <path d="M67.5 66.4c2.1-2.3 5.6-3.3 8.7-2.5" />
    </svg>
  );
}
