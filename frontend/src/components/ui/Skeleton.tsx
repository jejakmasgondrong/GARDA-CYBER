interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', width, height, style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={{ width, height, ...style }} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}
