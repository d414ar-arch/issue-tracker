import type { Issue, IssueStatus } from "@/types";

export type SprintFilter = "all" | "backlog" | number;
export type EpicFilter = "all" | number;

export function filterBySprint(
  issues: Issue[],
  filter: SprintFilter
): Issue[] {
  if (filter === "all") {
    return issues;
  }
  if (filter === "backlog") {
    return issues.filter((issue) => issue.sprint_id === null);
  }
  return issues.filter((issue) => issue.sprint_id === filter);
}

export function filterByEpic(issues: Issue[], epicId: EpicFilter): Issue[] {
  if (epicId === "all") {
    return issues;
  }
  return issues.filter((issue) => issue.epic_id === epicId);
}

// Group issues into their status columns and sort each column by
// sort_order (ascending), breaking ties by most recently updated first.
export function groupIssuesByStatus(
  issues: Issue[],
  statuses: IssueStatus[]
): Record<IssueStatus, Issue[]> {
  const grouped = Object.fromEntries(
    statuses.map((status) => [status, []] as [IssueStatus, Issue[]])
  ) as Record<IssueStatus, Issue[]>;

  for (const issue of issues) {
    if (grouped[issue.status]) {
      grouped[issue.status].push(issue);
    }
  }

  for (const status of statuses) {
    grouped[status].sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  return grouped;
}