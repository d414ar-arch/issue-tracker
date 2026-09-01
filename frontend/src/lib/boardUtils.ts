import type { Issue, IssueStatus } from "@/types";

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