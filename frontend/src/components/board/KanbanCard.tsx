import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router";
import { TagBadge } from "@/components/common";
import { UserAvatar } from "@/components/common";
import type { Issue } from "@/types";

interface KanbanCardProps {
  issue: Issue;
}

const priorityConfig = {
  low: {
    label: "Low",
    dot: "bg-gray-400",
  },
  medium: {
    label: "Medium",
    dot: "bg-yellow-400",
  },
  high: {
    label: "High",
    dot: "bg-orange-400",
  },
  urgent: {
    label: "Urgent",
    dot: "bg-red-500",
  },
};

export default function KanbanCard({ issue }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const priority = priorityConfig[issue.priority] || priorityConfig.low;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className={`group cursor-grab touch-none select-none rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/issues/${issue.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
        >
          {issue.title}
        </Link>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          #{issue.id}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${priority.dot}`} />
          {priority.label}
        </span>
      </div>

      {issue.tags && issue.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          {issue.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{issue.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {issue.assigned_user ? (
            <UserAvatar user={issue.assigned_user} size="sm" showName />
          ) : (
            <span className="italic">Unassigned</span>
          )}
        </div>
      </div>
    </div>
  );
}
