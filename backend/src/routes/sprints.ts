import { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/database.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware.js";

export type SprintStatus = "planned" | "active" | "completed";

export const VALID_SPRINT_STATUSES: SprintStatus[] = [
  "planned",
  "active",
  "completed",
];

export interface Sprint {
  id: number;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: SprintStatus;
  created_at: string;
}

export interface CreateSprintRequest {
  name: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
  status?: SprintStatus;
}

export interface UpdateSprintRequest {
  name?: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
  status?: SprintStatus;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(str: string): boolean {
  if (!DATE_REGEX.test(str)) return false;
  const date = new Date(`${str}T00:00:00Z`);
  return !isNaN(date.getTime());
}

function validateDates(startDate?: string, endDate?: string): string | null {
  if (startDate !== undefined && startDate !== null && !isValidDate(startDate)) {
    return "start_date must be a valid ISO date (YYYY-MM-DD)";
  }
  if (endDate !== undefined && endDate !== null && !isValidDate(endDate)) {
    return "end_date must be a valid ISO date (YYYY-MM-DD)";
  }
  if (
    startDate !== undefined &&
    startDate !== null &&
    endDate !== undefined &&
    endDate !== null &&
    endDate < startDate
  ) {
    return "end_date must be on or after start_date";
  }
  return null;
}

const sprintsRoute: FastifyPluginAsync = async function (fastify) {
  if (!(fastify as any).skipAuth) {
    fastify.addHook("preHandler", authMiddleware);
  } else {
    fastify.addHook(
      "preHandler",
      async (request: AuthenticatedRequest, reply) => {
        request.user = {
          id: "test-user-1",
          email: "test@example.com",
          name: "Test User",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    );
  }

  // GET /api/sprints - Get all sprints
  fastify.get("/", async function (request, reply) {
    try {
      const db = await getDatabase();

      const sprints = await db.all(`
        SELECT id, name, goal, start_date, end_date, status, created_at
        FROM sprints
        ORDER BY start_date DESC, id DESC
      `);

      await db.close();

      return {
        success: true,
        data: sprints,
        count: sprints.length,
      };
    } catch (error) {
      fastify.log.error({ err: error }, "Error fetching sprints:");
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch sprints",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/sprints - Create new sprint
  fastify.post<{ Body: CreateSprintRequest }>(
    "/",
    async function (request, reply) {
      try {
        const {
          name,
          goal,
          start_date,
          end_date,
          status = "planned",
        } = request.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: "Sprint name is required and must be a non-empty string",
          });
        }

        if (!VALID_SPRINT_STATUSES.includes(status)) {
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: `Status must be one of: ${VALID_SPRINT_STATUSES.join(", ")}`,
          });
        }

        const dateError = validateDates(start_date, end_date);
        if (dateError) {
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: dateError,
          });
        }

        const trimmedName = name.trim();
        const db = await getDatabase();

        const result = await db.run(
          "INSERT INTO sprints (name, goal, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)",
          [
            trimmedName,
            goal || null,
            start_date || null,
            end_date || null,
            status,
          ]
        );

        const newSprint = await db.get(
          "SELECT id, name, goal, start_date, end_date, status, created_at FROM sprints WHERE id = ?",
          [result.lastID]
        );

        await db.close();

        return reply.status(201).send({
          success: true,
          data: newSprint,
          message: "Sprint created successfully",
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Error creating sprint:");
        return reply.status(500).send({
          success: false,
          error: "Failed to create sprint",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // GET /api/sprints/:id - Get specific sprint
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    async function (request, reply) {
      try {
        const { id } = request.params;
        const sprintId = parseInt(id);

        if (isNaN(sprintId)) {
          return reply.status(400).send({
            success: false,
            error: "Invalid sprint ID",
            message: "Sprint ID must be a number",
          });
        }

        const db = await getDatabase();

        const sprint = await db.get(
          "SELECT id, name, goal, start_date, end_date, status, created_at FROM sprints WHERE id = ?",
          [sprintId]
        );

        await db.close();

        if (!sprint) {
          return reply.status(404).send({
            success: false,
            error: "Sprint not found",
            message: `Sprint with ID ${sprintId} does not exist`,
          });
        }

        return {
          success: true,
          data: sprint,
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Error fetching sprint:");
        return reply.status(500).send({
          success: false,
          error: "Failed to fetch sprint",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // PUT /api/sprints/:id - Update sprint
  fastify.put<{ Params: { id: string }; Body: UpdateSprintRequest }>(
    "/:id",
    async function (request, reply) {
      try {
        const { id } = request.params;
        const sprintId = parseInt(id);

        if (isNaN(sprintId)) {
          return reply.status(400).send({
            success: false,
            error: "Invalid sprint ID",
            message: "Sprint ID must be a number",
          });
        }

        const { name, goal, start_date, end_date, status } = request.body;

        if (
          name === undefined &&
          goal === undefined &&
          start_date === undefined &&
          end_date === undefined &&
          status === undefined
        ) {
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: "At least one field must be provided for update",
          });
        }

        if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: "Sprint name must be a non-empty string",
          });
        }

        if (status !== undefined && !VALID_SPRINT_STATUSES.includes(status)) {
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: `Status must be one of: ${VALID_SPRINT_STATUSES.join(", ")}`,
          });
        }

        const db = await getDatabase();

        const existingSprint = await db.get(
          "SELECT id, start_date, end_date FROM sprints WHERE id = ?",
          [sprintId]
        );
        if (!existingSprint) {
          await db.close();
          return reply.status(404).send({
            success: false,
            error: "Sprint not found",
            message: `Sprint with ID ${sprintId} does not exist`,
          });
        }

        // Combine existing dates with new values for cross-field validation
        const finalStart = start_date ?? existingSprint.start_date;
        const finalEnd = end_date ?? existingSprint.end_date;
        const dateError = validateDates(finalStart, finalEnd);
        if (dateError) {
          await db.close();
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: dateError,
          });
        }

        const updateFields = [];
        const updateParams = [];

        if (name !== undefined) {
          updateFields.push("name = ?");
          updateParams.push(name.trim());
        }
        if (goal !== undefined) {
          updateFields.push("goal = ?");
          updateParams.push(goal);
        }
        if (start_date !== undefined) {
          updateFields.push("start_date = ?");
          updateParams.push(start_date);
        }
        if (end_date !== undefined) {
          updateFields.push("end_date = ?");
          updateParams.push(end_date);
        }
        if (status !== undefined) {
          updateFields.push("status = ?");
          updateParams.push(status);
        }

        updateParams.push(sprintId);

        await db.run(
          `UPDATE sprints SET ${updateFields.join(", ")} WHERE id = ?`,
          updateParams
        );

        const updatedSprint = await db.get(
          "SELECT id, name, goal, start_date, end_date, status, created_at FROM sprints WHERE id = ?",
          [sprintId]
        );

        await db.close();

        return {
          success: true,
          data: updatedSprint,
          message: "Sprint updated successfully",
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Error updating sprint:");
        return reply.status(500).send({
          success: false,
          error: "Failed to update sprint",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // DELETE /api/sprints/:id - Delete sprint
  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    async function (request, reply) {
      try {
        const { id } = request.params;
        const sprintId = parseInt(id);

        if (isNaN(sprintId)) {
          return reply.status(400).send({
            success: false,
            error: "Invalid sprint ID",
            message: "Sprint ID must be a number",
          });
        }

        const db = await getDatabase();

        const existingSprint = await db.get(
          "SELECT id, name FROM sprints WHERE id = ?",
          [sprintId]
        );

        if (!existingSprint) {
          await db.close();
          return reply.status(404).send({
            success: false,
            error: "Sprint not found",
            message: `Sprint with ID ${sprintId} does not exist`,
          });
        }

        // Null out references; issues stay intact (ON DELETE SET NULL)
        await db.run("DELETE FROM sprints WHERE id = ?", [sprintId]);
        await db.close();

        return {
          success: true,
          message: `Sprint "${existingSprint.name}" deleted successfully`,
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Error deleting sprint:");
        return reply.status(500).send({
          success: false,
          error: "Failed to delete sprint",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
};

export default sprintsRoute;