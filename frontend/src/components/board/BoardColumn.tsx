import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Issue } from "@/types";
import KanbanCard from "./KanbanCard";

interface BoardColumnProps {
  status: string;
  label: string;
  accentClass: string;
  issues: Issue[];
}

export default function BoardColumn({
  status,
  label,
  accentClass,
  issues,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex h-full min-h-[300px] w-72 flex-col rounded-xl bg-muted/50 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {issues.length}
          </span>
        </div>
      </div>

      <SortableContext
        items={issues.map((issue) => issue.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex flex-1 flex-col gap-2 overflow-y-auto"
        >
          {issues.map((issue) => (
            <KanbanCard key={issue.id} issue={issue} />
          ))}
          {issues.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-sm text-muted-foreground">
              Drop issues here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
