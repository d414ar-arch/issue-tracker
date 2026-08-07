import { Badge } from "@/components/ui/badge";
import type { Issue } from "@/types";

interface StatusBadgeProps {
  status: Issue["status"];
  className?: string;
}

const statusConfig = {
  not_started: {
    variant: "default" as const,
    label: "Not Started",
    className: "bg-green-100 text-green-800 hover:bg-green-200",
  },
  in_progress: {
    variant: "secondary" as const,
    label: "In Progress",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  },
  review: {
    variant: "secondary" as const,
    label: "Review",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  testing: {
    variant: "secondary" as const,
    label: "Testing",
    className: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  },
  done: {
    variant: "outline" as const,
    label: "Done",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  },
  blocked: {
    variant: "destructive" as const,
    label: "Blocked",
    className: "bg-red-100 text-red-800 hover:bg-red-200",
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.not_started; // fallback to not_started

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ""}`}
    >
      {config.label}
    </Badge>
  );
}
