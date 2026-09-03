import { describe, it, expect } from "vitest";
import { filterBySprint, filterByEpic } from "@/lib/boardUtils";
import type { Issue } from "@/types";

const baseIssue = (overrides: Partial<Issue>): Issue => ({
  id: 1,
  title: "Issue",
  description: "desc",
  status: "not_started",
  priority: "medium",
  sort_order: 0,
  epic_id: null,
  sprint_id: null,
  created_by_user_id: "u1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("filterBySprint", () => {
  const issues: Issue[] = [
    baseIssue({ id: 1, sprint_id: 1 }),
    baseIssue({ id: 2, sprint_id: 2 }),
    baseIssue({ id: 3, sprint_id: null }),
  ];

  it("returns all issues for 'all'", () => {
    expect(filterBySprint(issues, "all")).toHaveLength(3);
  });

  it("returns only unassigned issues for 'backlog'", () => {
    const result = filterBySprint(issues, "backlog");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it("returns only issues in the given sprint", () => {
    const result = filterBySprint(issues, 2);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});

describe("filterByEpic", () => {
  const issues: Issue[] = [
    baseIssue({ id: 1, epic_id: 10 }),
    baseIssue({ id: 2, epic_id: 20 }),
    baseIssue({ id: 3, epic_id: null }),
  ];

  it("returns all issues for 'all'", () => {
    expect(filterByEpic(issues, "all")).toHaveLength(3);
  });

  it("returns only issues in the given epic", () => {
    const result = filterByEpic(issues, 20);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});