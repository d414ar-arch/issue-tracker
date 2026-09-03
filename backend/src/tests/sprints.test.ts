import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../index.js";
import { createTestSprint } from "./helpers.js";
import { FastifyInstance } from "fastify";
import "./setup.js";

describe("Sprints CRUD Operations", () => {
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

  describe("CREATE (POST /api/sprints)", () => {
    it("should create a sprint with minimal data", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/sprints",
        payload: { name: "Sprint 12" },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Sprint 12");
      expect(data.data.status).toBe("planned");
    });

    it("should create a sprint with dates, goal and status", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/sprints",
        payload: {
          name: "Sprint 13",
          goal: "Ship auth",
          start_date: "2026-09-01",
          end_date: "2026-09-14",
          status: "active",
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.data.goal).toBe("Ship auth");
      expect(data.data.start_date).toBe("2026-09-01");
      expect(data.data.end_date).toBe("2026-09-14");
      expect(data.data.status).toBe("active");
    });

    it("should reject empty name", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/sprints",
        payload: { name: "" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject end date before start date", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/sprints",
        payload: {
          name: "Bad Sprint",
          start_date: "2026-09-14",
          end_date: "2026-09-01",
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
    });

    it("should reject invalid status", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/sprints",
        payload: { name: "X", status: "on_hold" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject invalid date format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/sprints",
        payload: { name: "X", start_date: "oops" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("READ (GET /api/sprints)", () => {
    beforeEach(async () => {
      await createTestSprint({ name: "Sprint 1", start_date: "2026-08-01" });
      await createTestSprint({ name: "Sprint 2", start_date: "2026-09-01" });
    });

    it("should list all sprints ordered by start_date desc", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/sprints",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe("Sprint 2");
    });

    it("should get single sprint by ID", async () => {
      const sprint = await createTestSprint({ name: "Sprint 3" });

      const response = await app.inject({
        method: "GET",
        url: `/api/sprints/${sprint.id}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.name).toBe("Sprint 3");
    });

    it("should return 404 for non-existent sprint", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/sprints/999999",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("UPDATE (PUT /api/sprints/:id)", () => {
    it("should activate a sprint", async () => {
      const sprint = await createTestSprint({ status: "planned" });

      const response = await app.inject({
        method: "PUT",
        url: `/api/sprints/${sprint.id}`,
        payload: { status: "active" },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.status).toBe("active");
    });

    it("should update dates and enforce order", async () => {
      const sprint = await createTestSprint();

      const response = await app.inject({
        method: "PUT",
        url: `/api/sprints/${sprint.id}`,
        payload: { start_date: "2026-09-10", end_date: "2026-09-01" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject empty update body", async () => {
      const sprint = await createTestSprint();

      const response = await app.inject({
        method: "PUT",
        url: `/api/sprints/${sprint.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("DELETE (DELETE /api/sprints/:id)", () => {
    it("should delete a sprint", async () => {
      const sprint = await createTestSprint({ name: "To Delete" });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/sprints/${sprint.id}`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 404 for non-existent sprint", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/sprints/999999",
      });

      expect(response.statusCode).toBe(404);
    });
  });
});