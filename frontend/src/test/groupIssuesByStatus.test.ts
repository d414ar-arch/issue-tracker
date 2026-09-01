import { describe, it, expect } from "vitest";
import { groupIssuesByStatus } from "@/lib/boardUtils";
import type { Issue } from "@/types";

const STATUSES = [
  "not_started",
  "in_progress",
  "review",
  "testing",
  "done",
  "blocked",
] as const;

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    id: 1,
    title: "Issue",
    description: null,
    status: "not_started",
    priority: "medium",
    sort_order: 0,
    created_by_user_id: "u1",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("groupIssuesByStatus", () => {
  it("distributes issues into their respective status columns", () => {
    const issues = [
      makeIssue({ id: 1, status: "not_started" }),
      makeIssue({ id: 2, status: "done" }),
      makeIssue({ id: 3, status: "in_progress" }),
    ];

    const result = groupIssuesByStatus(issues, [...STATUSES]);

    expect(result.not_started.map((i) => i.id)).toEqual([1]);
    expect(result.in_progress.map((i) => i.id)).toEqual([3]);
    expect(result.done.map((i) => i.id)).toEqual([2]);
    expect(result.review).toHaveLength(0);
    expect(result.testing).toHaveLength(0);
    expect(result.blocked).toHaveLength(0);
  });

  it("sorts issues within a column by sort_order ascending", () => {
    const issues = [
      makeIssue({ id: 1, status: "in_progress", sort_order: 100 }),
      makeIssue({ id: 2, status: "in_progress", sort_order: 0 }),
      makeIssue({ id: 3, status: "in_progress", sort_order: 50 }),
    ];

    const result = groupIssuesByStatus(issues, [...STATUSES]);

    expect(result.in_progress.map((i) => i.id)).toEqual([2, 3, 1]);
  });

  it("breaks sort_order ties by most recently updated first", () => {
    const issues = [
      makeIssue({
        id: 1,
        status: "in_progress",
        sort_order: 0,
        updated_at: "2026-09-01T10:00:00.000Z",
      }),
      makeIssue({
        id: 2,
        status: "in_progress",
        sort_order: 0,
        updated_at: "2026-09-02T10:00:00.000Z",
      }),
    ];

    const result = groupIssuesByStatus(issues, [...STATUSES]);

    expect(result.in_progress.map((i) => i.id)).toEqual([2, 1]);
  });

  it("ignores issues whose status is not part of the configured columns", () => {
    const issues = [makeIssue({ id: 1, status: "done" })];

    const result = groupIssuesByStatus(issues, ["not_started", "in_progress"] as typeof STATUSES);

    expect(result.not_started).toHaveLength(0);
    expect(result.in_progress).toHaveLength(0);
  });
});