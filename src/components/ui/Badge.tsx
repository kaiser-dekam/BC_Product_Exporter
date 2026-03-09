type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-white/5 border-border text-muted",
  success: "bg-success/10 border-success/30 text-success",
  warning: "bg-warning/10 border-warning/30 text-warning",
  danger: "bg-danger/10 border-danger/30 text-danger",
  accent: "bg-accent/10 border-accent/30 text-accent",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
