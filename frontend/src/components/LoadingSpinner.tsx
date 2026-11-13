interface LoadingSpinnerProps {
  label: string;
  size?: "sm" | "md" | "lg";
  centered?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "size-4 border-2",
  md: "size-7 border-[3px]",
  lg: "size-11 border-4",
};

export function LoadingSpinner({ label, size = "md", centered = false, className = "" }: LoadingSpinnerProps) {
  const spinner = (
    <span
      aria-label={label}
      className={`inline-block shrink-0 animate-spin rounded-full border-gamevault-accent/25 border-t-gamevault-accent ${sizeClasses[size]} ${className}`}
      role="status"
    >
      <span className="sr-only">{label}</span>
    </span>
  );

  if (!centered) return spinner;

  return <div className="flex min-h-32 items-center justify-center py-8">{spinner}</div>;
}
