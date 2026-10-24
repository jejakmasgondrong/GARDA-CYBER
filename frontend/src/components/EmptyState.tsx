interface EmptyStateProps {
  title: string;
  description: string;
  hint?: string;
}

/** Komponen empty state yang jujur — dipakai di semua halaman tanpa data nyata. */
export function EmptyState({ title, description, hint }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel-2)] p-7 text-center">
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      <p className="mx-auto mb-3 max-w-md text-xs leading-relaxed text-[var(--sub)]">{description}</p>
      {hint && (
        <code className="rounded bg-[var(--panel)] border border-[var(--line)] px-1.5 py-0.5 text-[11px]">
          {hint}
        </code>
      )}
    </div>
  );
}
