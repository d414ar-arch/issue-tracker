import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../index.js";
import {
  createTestDbUser,
  createTestIssue,
  createTestEpic,
  createTestSprint,
} from "./helpers.js";
import { FastifyInstance } from "fastify";
import "./setup.js";

describe("Issues Epic/Sprint Assignment", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({ skipAuth: true });
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("CREATE with epic/sprint", () => {
    it("should create issue assigned to an epic and sprint", async () => {
      const epic = await createTestEpic({ name: "Epic A" });
      const sprint = await createTestSprint({ name: "Sprint 1" });

      const response = await app.inject({
        method: "POST",
        url: "/api/issues",
        payload: { title: "X", epic_id: epic.id, sprint_id: sprint.id },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.data.epic_id).toBe(epic.id);
      expect(data.data.sprint_id).toBe(sprint.id);
      expect(data.data.epic).toEqual({ id: epic.id, name: "Epic A" });
      expect(data.data.sprint.name).toBe("Sprint 1");
    });

    it("should reject invalid epic id on create", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/issues",
        payload: { title: "X", epic_id: 999 },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
    });

    it("should reject invalid sprint id on create", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/issues",
        payload: { title: "X", sprint_id: 999 },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
    });
  });

  describe("UPDATE epic/sprint", () => {
    it("should assign issue to sprint via PUT", async () => {
      await createTestDbUser();
      const issue = await createTestIssue({
        title: "Assign me",
        created_by_user_id: "test-user-1",
      });
      const sprint = await createTestSprint({ name: "Sprint 2" });

      const response = await app.inject({
        method: "PUT",
        url: `/api/issues/${issue.id}`,
        payload: { sprint_id: sprint.id },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.sprint_id).toBe(sprint.id);
      expect(data.data.sprint.name).toBe("Sprint 2");
    });

    it("should clear epic assignment via null", async () => {
      await createTestDbUser();
      const epic = await createTestEpic({ name: "Epic X" });
      const issue = await createTestIssue({
        title: "Clear me",
        epic_id: epic.id,
        created_by_user_id: "test-user-1",
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api/issues/${issue.id}`,
        payload: { epic_id: null },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.epic_id).toBeNull();
      expect(data.data.epic).toBeNull();
    });

    it("should reject invalid sprint id on update", async () => {
      await createTestDbUser();
      const issue = await createTestIssue({
        title: "Reject me",
        created_by_user_id: "test-user-1",
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api/issues/${issue.id}`,
        payload: { sprint_id: 999 },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("FILTER by epic/sprint", () => {
    let sprint1: any;
    let sprint2: any;
    let epic1: any;
    let epic2: any;

    beforeEach(async () => {
      await createTestDbUser();
      sprint1 = await createTestSprint({ name: "Sprint A" });
      sprint2 = await createTestSprint({ name: "Sprint B" });
      epic1 = await createTestEpic({ name: "Epic 1" });
      epic2 = await createTestEpic({ name: "Epic 2" });

      await createTestIssue({
        title: "In sprint1+epic1",
        status: "not_started",
        sprint_id: sprint1.id,
        epic_id: epic1.id,
        created_by_user_id: "test-user-1",
      });
      await createTestIssue({
        title: "In sprint2+epic2",
        status: "not_started",
        sprint_id: sprint2.id,
        epic_id: epic2.id,
        created_by_user_id: "test-user-1",
      });
      await createTestIssue({
        title: "No sprint",
        status: "not_started",
        created_by_user_id: "test-user-1",
      });
    });

    it("should filter issues by sprint_id", async () => {
      const sprintA = await app.inject({
        method: "GET",
        url: `/api/issues?sprint_id=${sprint1.id}`,
      });
      const dataA = JSON.parse(sprintA.payload);
      expect(dataA.data).toHaveLength(1);
      expect(dataA.data[0].title).toBe("In sprint1+epic1");
    });

    it("should filter issues by epic_id", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/issues?epic_id=${epic2.id}`,
      });
      const data = JSON.parse(response.payload);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe("In sprint2+epic2");
    });

    it("should filter issues by epic AND sprint combined", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/issues?epic_id=${epic1.id}&sprint_id=${sprint1.id}`,
      });
      const data = JSON.parse(response.payload);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe("In sprint1+epic1");
    });

    it("should combine epic filter with status filter", async () => {
      await createTestIssue({
        title: "In epic2 status review",
        status: "review",
        epic_id: epic2.id,
        created_by_user_id: "test-user-1",
      });
      const response = await app.inject({
        method: "GET",
        url: `/api/issues?epic_id=${epic2.id}&status=review`,
      });
      const data = JSON.parse(response.payload);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe("In epic2 status review");
    });

    it("should return 404 for nonexistent issue", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/issues/999999",
      });
      expect(response.statusCode).toBe(404);
    });
  });
});