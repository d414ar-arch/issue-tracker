import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BoardColumn } from "@/components/board";
import { KanbanCard } from "@/components/board";
import { useToast } from "@/hooks/useToast";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  groupIssuesByStatus,
  filterBySprint,
  filterByEpic,
  type SprintFilter,
  type EpicFilter,
} from "@/lib/boardUtils";
import { issuesApi, sprintsApi, epicsApi } from "@/lib/api";
import type { Issue, IssueStatus, Sprint, Epic } from "@/types";

type BoardColumnConfig = {
  status: IssueStatus;
  label: string;
  accentClass: string;
};

const BOARD_COLUMNS: BoardColumnConfig[] = [
  { status: "not_started", label: "Not Started", accentClass: "bg-green-500" },
  { status: "in_progress", label: "In Progress", accentClass: "bg-blue-500" },
  { status: "review", label: "Review", accentClass: "bg-amber-500" },
  { status: "testing", label: "Testing", accentClass: "bg-cyan-500" },
  { status: "done", label: "Done", accentClass: "bg-purple-500" },
  { status: "blocked", label: "Blocked", accentClass: "bg-red-500" },
];

const SORT_STEP = 10000;

function computeSortOrder(
  items: Issue[],
  movedIndex: number
): number {
  const prev = items[movedIndex - 1];
  const next = items[movedIndex + 1];

  if (prev && next) {
    return Math.floor((prev.sort_order + next.sort_order) / 2);
  }
  if (prev) {
    return prev.sort_order + SORT_STEP;
  }
  if (next) {
    return Math.max(0, next.sort_order - SORT_STEP);
  }
  return SORT_STEP;
}

export default function KanbanBoardPage() {
  const toast = useToast();
  const [issuesByStatus, setIssuesByStatus] = useState<
    Record<IssueStatus, Issue[]>
  >(() =>
    Object.fromEntries(
      BOARD_COLUMNS.map((c) => [c.status, [] as Issue[]])
    ) as Record<IssueStatus, Issue[]>
  );
  const [loading, setLoading] = useState(true);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprintFilter, setSprintFilter] = useState<SprintFilter>("all");
  const [epicFilter, setEpicFilter] = useState<EpicFilter>("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const filteredIssues = useMemo(() => {
    const flat = Object.values(issuesByStatus).flat();
    return groupIssuesByStatus(
      filterByEpic(filterBySprint(flat, sprintFilter), epicFilter),
      BOARD_COLUMNS.map((c) => c.status)
    );
  }, [issuesByStatus, sprintFilter, epicFilter]);

  const fetchIssues = useCallback(async () => {
    try {
      const [issuesResponse, sprintsResponse, epicsResponse] =
        await Promise.all([
          issuesApi.getIssues({ limit: 100 }),
          sprintsApi.getSprints(),
          epicsApi.getEpics(),
        ]);
      setSprints(sprintsResponse.data || []);
      setEpics(epicsResponse.data || []);
      setIssuesByStatus(
        groupIssuesByStatus(
          issuesResponse.data || [],
          BOARD_COLUMNS.map((c) => c.status)
        )
      );
    } catch (err) {
      console.error("Failed to load board:", err);
      toast.error("Failed to load board. Please try again.");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    fetchIssues().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live refresh: refetch on focus + poll while visible; paused during a drag
  useRealtimeRefresh({ onRefresh: fetchIssues, paused: activeIssue !== null });

  const findIssueById = (id: number | string) => {
    for (const issues of Object.values(issuesByStatus)) {
      const found = issues.find((issue) => issue.id === id);
      if (found) return found;
    }
    return null;
  };

  const findStatusById = (id: number | string): IssueStatus | null => {
    for (const [status, issues] of Object.entries(issuesByStatus) as [
      IssueStatus,
      Issue[],
    ][]) {
      if (issues.some((issue) => issue.id === id)) return status;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const issue = findIssueById(event.active.id);
    setActiveIssue(issue || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeStatus = findStatusById(active.id);
    const overStatus =
      typeof over.id === "string" && BOARD_COLUMNS.some((c) => c.status === over.id)
        ? (over.id as IssueStatus)
        : findStatusById(over.id);

    if (!activeStatus || !overStatus || activeStatus === overStatus) return;

    setIssuesByStatus((prev) => {
      const activeIndex = prev[activeStatus].findIndex(
        (issue) => issue.id === active.id
      );
      if (activeIndex === -1) return prev;

      const moved = { ...prev[activeStatus][activeIndex], status: overStatus };
      const activeList = prev[activeStatus].filter(
        (issue) => issue.id !== active.id
      );

      let overList = prev[overStatus];
      const overIndex = overList.findIndex((issue) => issue.id === over.id);
      if (overIndex >= 0) {
        overList = arrayMove(overList, overIndex, overList.length);
      }

      return {
        ...prev,
        [activeStatus]: activeList,
        [overStatus]: [...overList, moved],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const activeStatus = findStatusById(active.id);
    const overStatus =
      typeof over.id === "string" && BOARD_COLUMNS.some((c) => c.status === over.id)
        ? (over.id as IssueStatus)
        : findStatusById(over.id);

    if (!activeStatus || !overStatus) return;

    if (activeStatus === overStatus) {
      // Reorder within the same column
      const oldIndex = issuesByStatus[activeStatus].findIndex(
        (issue) => issue.id === active.id
      );
      const newIndex = issuesByStatus[overStatus].findIndex(
        (issue) => issue.id === over.id
      );
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(
        issuesByStatus[overStatus],
        oldIndex,
        newIndex
      );
      const movedIndex = newIndex;
      const newSortOrder = computeSortOrder(reordered, movedIndex);

      setIssuesByStatus((prev) => ({
        ...prev,
        [overStatus]: reordered.map((issue) =>
          issue.id === active.id
            ? { ...issue, sort_order: newSortOrder }
            : issue
        ),
      }));

      try {
        await issuesApi.updateIssue(Number(active.id), {
          status: overStatus,
          sort_order: newSortOrder,
        });
      } catch (err) {
        console.error("Failed to reorder issue:", err);
        toast.error("Failed to reorder issue.");
        fetchIssues();
      }
    } else {
      // Moved between columns — compute position in the over column
      const moved = issuesByStatus[activeStatus].find(
        (issue) => issue.id === active.id
      );
      if (!moved) return;

      const overIndex = issuesByStatus[overStatus].findIndex(
        (issue) => issue.id === over.id
      );
      const baseList = issuesByStatus[overStatus].filter(
        (issue) => issue.id !== active.id
      );
      const insertAt =
        overIndex === -1 ? baseList.length : overIndex;
      const updatedList = [
        ...baseList.slice(0, insertAt),
        { ...moved, status: overStatus },
        ...baseList.slice(insertAt),
      ];
      const newSortOrder = computeSortOrder(updatedList, insertAt);

      setIssuesByStatus((prev) => ({
        ...prev,
        [activeStatus]: prev[activeStatus].filter(
          (issue) => issue.id !== active.id
        ),
        [overStatus]: updatedList.map((issue) =>
          issue.id === active.id
            ? { ...issue, status: overStatus, sort_order: newSortOrder }
            : issue
        ),
      }));

      try {
        await issuesApi.updateIssue(Number(active.id), {
          status: overStatus,
          sort_order: newSortOrder,
        });
      } catch (err) {
        console.error("Failed to move issue:", err);
        toast.error("Failed to move issue.");
        fetchIssues();
      }
    }
  };

  const totalIssues = useMemo(
    () =>
      Object.values(filteredIssues).reduce(
        (sum, issues) => sum + issues.length,
        0
      ),
    [filteredIssues]
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState message="Loading board..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Board</h1>
          <p className="text-muted-foreground">
            Drag and drop issues between statuses to update them.
          </p>
        </div>
        <Button asChild>
          <Link to="/issues/new">Create Issue</Link>
        </Button>
      </div>

      {/* Sprint + Epic filters */}
      <div className="flex flex-wrap gap-4">
        <div className="w-56 space-y-2">
          <label className="text-sm font-medium">Sprint</label>
          <Select
            value={String(sprintFilter)}
            onValueChange={(value) =>
              setSprintFilter(
                value === "all"
                  ? "all"
                  : value === "backlog"
                    ? "backlog"
                    : Number(value)
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All sprints" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sprints</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={String(sprint.id)}>
                  {sprint.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56 space-y-2">
          <label className="text-sm font-medium">Epic</label>
          <Select
            value={String(epicFilter)}
            onValueChange={(value) =>
              setEpicFilter(value === "all" ? "all" : Number(value))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All epics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All epics</SelectItem>
              {epics.map((epic) => (
                <SelectItem key={epic.id} value={String(epic.id)}>
                  {epic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {BOARD_COLUMNS.map((column) => (
            <BoardColumn
              key={column.status}
              status={column.status}
              label={column.label}
              accentClass={column.accentClass}
              issues={filteredIssues[column.status] || []}
            />
          ))}
          <DragOverlay>
            {activeIssue ? <KanbanCard issue={activeIssue} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <p className="text-sm text-muted-foreground">
        {totalIssues} total issues
      </p>
    </div>
  );
}
