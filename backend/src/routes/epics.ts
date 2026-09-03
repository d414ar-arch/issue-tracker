import { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/database.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware.js";

export interface Epic {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface CreateEpicRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateEpicRequest {
  name?: string;
  description?: string;
  color?: string;
}

const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const epicsRoute: FastifyPluginAsync = async function (fastify) {
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

  // GET /api/epics - Get all epics
  fastify.get("/", async function (request, reply) {
    try {
      const db = await getDatabase();

      const epics = await db.all(`
        SELECT id, name, description, color, created_at
        FROM epics
        ORDER BY name ASC
      `);

      await db.close();

      return {
        success: true,
        data: epics,
        count: epics.length,
      };
    } catch (error) {
      fastify.log.error({ err: error }, "Error fetching epics:");
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch epics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/epics - Create new epic
  fastify.post<{ Body: CreateEpicRequest }>(
    "/",
    async function (request, reply) {
      try {
        const { name, description, color = "#6366f1" } = request.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: "Epic name is required and must be a non-empty string",
          });
        }

        if (!COLOR_REGEX.test(color)) {
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: "Color must be a valid hex color (e.g., #ff0000)",
          });
        }

        const trimmedName = name.trim();
        const db = await getDatabase();

        const result = await db.run(
          "INSERT INTO epics (name, description, color) VALUES (?, ?, ?)",
          [trimmedName, description || null, color]
        );

        const newEpic = await db.get(
          "SELECT id, name, description, color, created_at FROM epics WHERE id = ?",
          [result.lastID]
        );

        await db.close();

        return reply.status(201).send({
          success: true,
          data: newEpic,
          message: "Epic created successfully",
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Error creating epic:");
        return reply.status(500).send({
          success: false,
          error: "Failed to create epic",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // GET /api/epics/:id - Get specific epic
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    async function (request, reply) {
      try {
        const { id } = request.params;
        const epicId = parseInt(id);

        if (isNaN(epicId)) {
          return reply.status(400).send({
            success: false,
            error: "Invalid epic ID",
            message: "Epic ID must be a number",
          });
        }

        const db = await getDatabase();

        const epic = await db.get(
          "SELECT id, name, description, color, created_at FROM epics WHERE id = ?",
          [epicId]
        );

        await db.close();

        if (!epic) {
          return reply.status(404).send({
            success: false,
            error: "Epic not found",
            message: `Epic with ID ${epicId} does not exist`,
          });
        }

        return {
          success: true,
          data: epic,
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Error fetching epic:");
        return reply.status(500).send({
          success: false,
          error: "Failed to fetch epic",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // PUT /api/epics/:id - Update epic
  fastify.put<{ Params: { id: string }; Body: UpdateEpicRequest }>(
    "/:id",
    async function (request, reply) {
      try {
        const { id } = request.params;
        const epicId = parseInt(id);

        if (isNaN(epicId)) {
          return reply.status(400).send({
            success: false,
            error: "Invalid epic ID",
            message: "Epic ID must be a number",
          });
        }

        const { name, description, color } = request.body;

        if (
          name === undefined &&
          description === undefined &&
          color === undefined
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
            message: "Epic name must be a non-empty string",
          });
        }

        if (color !== undefined && !COLOR_REGEX.test(color)) {
          return reply.status(400).send({
            success: false,
            error: "Validation error",
            message: "Color must be a valid hex color (e.g., #ff0000)",
          });
        }

        const db = await getDatabase();

        const existingEpic = await db.get(
          "SELECT id FROM epics WHERE id = ?",
          [epicId]
        );
        if (!existingEpic) {
          await db.close();
          return reply.status(404).send({
            success: false,
            error: "Epic not found",
            message: `Epic with ID ${epicId} does not exist`,
          });
        }

        const updateFields = [];
        const updateParams = [];

        if (name !== undefined) {
          updateFields.push("name = ?");
          updateParams.push(name.trim());
        }
        if (description !== undefined) {
          updateFields.push("description = ?");
          updateParams.push(description);
        }
        if (color !== undefined) {
          updateFields.push("color = ?");
          updateParams.push(color);
        }

        updateParams.push(epicId);

        await db.run(
          `UPDATE epics SET ${updateFields.join(", ")} WHERE id = ?`,
          updateParams
        );

        const updatedEpic = await db.get(
          "SELECT id, name, description, color, created_at FROM epics WHERE id = ?",
          [epicId]
        );

        await db.close();

        return {
          success: true,
          data: updatedEpic,
          message: "Epic updated successfully",
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Error updating epic:");
        return reply.status(500).send({
          success: false,
          error: "Failed to update epic",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // DELETE /api/epics/:id - Delete epic
  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    async function (request, reply) {
      try {
        const { id } = request.params;
        const epicId = parseInt(id);

        if (isNaN(epicId)) {
          return reply.status(400).send({
            success: false,
            error: "Invalid epic ID",
            message: "Epic ID must be a number",
          });
        }

        const db = await getDatabase();

        const existingEpic = await db.get(
          "SELECT id, name FROM epics WHERE id = ?",
          [epicId]
        );

        if (!existingEpic) {
          await db.close();
          return reply.status(404).send({
            success: false,
            error: "Epic not found",
            message: `Epic with ID ${epicId} does not exist`,
          });
        }

        // Null out references; issues stay intact (ON DELETE SET NULL)
        await db.run("DELETE FROM epics WHERE id = ?", [epicId]);
        await db.close();

        return {
          success: true,
          message: `Epic "${existingEpic.name}" deleted successfully`,
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Error deleting epic:");
        return reply.status(500).send({
          success: false,
          error: "Failed to delete epic",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
};

export default epicsRoute;