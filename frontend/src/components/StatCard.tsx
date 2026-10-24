interface StatCardProps {
  label: string;
  value: string;
  sub: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3.5">
      <p className="mb-1.5 text-[11px] font-semibold text-[var(--sub)]">{label}</p>
      <p className="text-xl font-extrabold">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--sub)]">{sub}</p>
    </div>
  );
}
