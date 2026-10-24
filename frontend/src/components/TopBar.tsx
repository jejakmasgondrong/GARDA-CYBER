interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2.5 border-b border-[var(--line)] bg-[var(--panel)] px-5 py-3">
      <div className="text-xs text-[var(--sub)]">
        GARDA CYBER <b className="mt-0.5 block text-[15px] font-bold text-[var(--text)]">{title}</b>
      </div>
      <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sub)]">
        Mode Purwarupa
      </span>
    </div>
  );
}
