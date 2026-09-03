import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../index.js";
import { createTestDbUser, createTestIssue, createTestEpic } from "./helpers.js";
import { FastifyInstance } from "fastify";
import "./setup.js";

describe("Epics CRUD Operations", () => {
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

  describe("CREATE (POST /api/epics)", () => {
    it("should create an epic with minimal data", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/epics",
        payload: { name: "Migrate to PostgreSQL" },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Migrate to PostgreSQL");
      expect(data.data.color).toBe("#6366f1");
      expect(data.data.id).toBeDefined();
    });

    it("should create an epic with description and color", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/epics",
        payload: {
          name: "Rebuild Auth",
          description: "Replace legacy auth",
          color: "#ef4444",
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.data.description).toBe("Replace legacy auth");
      expect(data.data.color).toBe("#ef4444");
    });

    it("should reject empty name", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/epics",
        payload: { name: "   " },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
    });

    it("should reject invalid color format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/epics",
        payload: { name: "Bad color", color: "red" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("READ (GET /api/epics)", () => {
    beforeEach(async () => {
      await createTestEpic({ name: "Epic A" });
      await createTestEpic({ name: "Epic B" });
    });

    it("should list all epics ordered by name", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/epics",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe("Epic A");
    });

    it("should get single epic by ID", async () => {
      const epic = await createTestEpic({ name: "Specific Epic" });

      const response = await app.inject({
        method: "GET",
        url: `/api/epics/${epic.id}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.name).toBe("Specific Epic");
    });

    it("should return 404 for non-existent epic", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/epics/999999",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("UPDATE (PUT /api/epics/:id)", () => {
    it("should update epic name and color", async () => {
      const epic = await createTestEpic({ name: "Original", color: "#6366f1" });

      const response = await app.inject({
        method: "PUT",
        url: `/api/epics/${epic.id}`,
        payload: { name: "Renamed", color: "#10b981" },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.name).toBe("Renamed");
      expect(data.data.color).toBe("#10b981");
    });

    it("should reject empty update body", async () => {
      const epic = await createTestEpic({ name: "Epic" });

      const response = await app.inject({
        method: "PUT",
        url: `/api/epics/${epic.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 404 for non-existent epic", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/epics/999999",
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE (DELETE /api/epics/:id)", () => {
    it("should delete an epic and null out issue references", async () => {
      const epic = await createTestEpic({ name: "To Delete" });
      await createTestDbUser();
      const issue = await createTestIssue({ epic_id: epic.id });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/epics/${epic.id}`,
      });

      expect(response.statusCode).toBe(200);

      const issueResponse = await app.inject({
        method: "GET",
        url: `/api/issues/${issue.id}`,
      });
      const issueData = JSON.parse(issueResponse.payload);
      expect(issueData.data.epic_id).toBeNull();
    });

    it("should return 404 for non-existent epic", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/epics/999999",
      });

      expect(response.statusCode).toBe(404);
    });
  });
});