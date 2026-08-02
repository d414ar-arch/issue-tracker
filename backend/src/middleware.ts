import { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "./auth.js";

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

function convertHeaders(requestHeaders: FastifyRequest["headers"]): Headers {
  const headers = new Headers();
  Object.entries(requestHeaders).forEach(([key, value]) => {
    if (value) {
      const headerValue = Array.isArray(value) ? value[0] : value;
      if (typeof headerValue === "string") {
        headers.append(key, headerValue);
      }
    }
  });
  return headers;
}

async function authenticateWithApiKey(
  request: AuthenticatedRequest
): Promise<boolean> {
  const apiKey = request.headers["x-api-key"];
  if (typeof apiKey !== "string" || !apiKey) {
    return false;
  }

  try {
    const result = await auth.api.verifyApiKey({
      body: { key: apiKey },
    });

    if (result?.valid && result.key?.referenceId) {
      const { getDatabase } = await import("./db/database.js");
      const db = await getDatabase();
      try {
        const user = await db.get(
          'SELECT id, name, email, "emailVerified" as "emailVerified", image, "createdAt" as "createdAt", "updatedAt" as "updatedAt" FROM "user" WHERE id = ?',
          [result.key.referenceId]
        );
        if (user) {
          request.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: !!user.emailVerified,
            image: user.image ?? null,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
          };
          return true;
        }
      } finally {
        await db.close();
      }
    }
  } catch (error) {
    console.error("API key verification error:", error);
  }
  return false;
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
) {
  try {
    const headers = convertHeaders(request.headers);

    // Get session from BetterAuth
    const session = await auth.api.getSession({
      headers: headers,
    });

    if (session?.user) {
      // Attach user to request
      request.user = {
        ...session.user,
        image: session.user.image ?? null,
      };
      return;
    }

    // Fall back to API key authentication
    if (await authenticateWithApiKey(request)) {
      return;
    }

    return reply.status(401).send({
      error: "Unauthorized",
      message: "Authentication required",
    });
  } catch (error) {
    console.error("Auth middleware error:", error);
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid authentication",
    });
  }
}

// Optional auth middleware (doesn't fail if no auth)
export async function optionalAuthMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
) {
  try {
    const headers = convertHeaders(request.headers);

    // Get session from BetterAuth
    const session = await auth.api.getSession({
      headers: headers,
    });

    if (session?.user) {
      request.user = {
        ...session.user,
        image: session.user.image ?? null,
      };
    }
  } catch (error) {
    // Silently fail for optional auth
    console.debug("Optional auth failed:", error);
  }
}
