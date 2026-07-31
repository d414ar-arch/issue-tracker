#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { getDatabase } from "./database.js";

async function seedDatabase() {
  const db = await getDatabase();

  try {
    console.log("Seeding database with sample data...");

    await db.run("DELETE FROM issue_tags");
    await db.run("DELETE FROM issues");
    await db.run("DELETE FROM tags");
    await db.run("DELETE FROM session");
    await db.run("DELETE FROM account");
    await db.run("DELETE FROM verification");
    await db.run("DELETE FROM \"user\"");

    if (process.env.DATABASE_URL) {
      await db.run("ALTER SEQUENCE issues_id_seq RESTART WITH 1");
      await db.run("ALTER SEQUENCE tags_id_seq RESTART WITH 1");
    }

    const users = [
      { id: "john123", email: "john@example.com", name: "John Doe" },
      { id: "jane456", email: "jane@example.com", name: "Jane Smith" },
      { id: "admin789", email: "admin@example.com", name: "Admin User" },
      { id: "dev101", email: "dev@example.com", name: "Developer" },
    ];

    const userIds: string[] = [];
    for (const user of users) {
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO "user" ("id", "email", "name", "emailVerified", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, user.email, user.name, false, new Date(), new Date()]
      );
      userIds.push(user.id);
      console.log(`Created user: ${user.name} (${user.email})`);
    }

    const tags = [
      { name: "frontend", color: "#3b82f6" },
      { name: "backend", color: "#10b981" },
      { name: "bug", color: "#ef4444" },
      { name: "feature", color: "#8b5cf6" },
      { name: "enhancement", color: "#f59e0b" },
      { name: "documentation", color: "#6b7280" },
    ];

    const tagIds: number[] = [];
    for (const tag of tags) {
      const result = await db.run(
        "INSERT INTO tags (name, color) VALUES (?, ?)",
        [tag.name, tag.color]
      );
      tagIds.push(result.lastID as number);
      console.log(`Created tag: ${tag.name}`);
    }

    const issues = [
      {
        title: "Set up project structure",
        description:
          "Initialize the project with proper directory structure and configuration files.",
        status: "done",
        assigned_user_id: userIds[0],
        created_by_user_id: userIds[2],
        tags: [tagIds[1]],
      },
      {
        title: "Design user authentication flow",
        description:
          "Create wireframes and user flows for the authentication system including sign up, sign in, and password reset.",
        status: "in_progress",
        assigned_user_id: userIds[1],
        created_by_user_id: userIds[2],
        tags: [tagIds[0], tagIds[3]],
      },
      {
        title: "Fix issue list filtering",
        description:
          'The issue list filter by status is not working correctly. When selecting "in progress", it shows all issues.',
        status: "not_started",
        assigned_user_id: userIds[0],
        created_by_user_id: userIds[1],
        tags: [tagIds[0], tagIds[2]],
      },
      {
        title: "Add dark mode support",
        description:
          "Implement dark mode toggle functionality with proper theme switching and persistence.",
        status: "not_started",
        assigned_user_id: null,
        created_by_user_id: userIds[3],
        tags: [tagIds[0], tagIds[4]],
      },
      {
        title: "API documentation",
        description:
          "Create comprehensive API documentation with examples for all endpoints.",
        status: "not_started",
        assigned_user_id: userIds[3],
        created_by_user_id: userIds[2],
        tags: [tagIds[5]],
      },
      {
        title: "Database performance optimization",
        description:
          "Review and optimize database queries for better performance, especially for the issues list with filtering.",
        status: "not_started",
        assigned_user_id: null,
        created_by_user_id: userIds[2],
        tags: [tagIds[1], tagIds[4]],
      },
    ];

    for (const issue of issues) {
      const result = await db.run(
        "INSERT INTO issues (title, description, status, assigned_user_id, created_by_user_id) VALUES (?, ?, ?, ?, ?)",
        [
          issue.title,
          issue.description,
          issue.status,
          issue.assigned_user_id,
          issue.created_by_user_id,
        ]
      );

      const issueId = result.lastID as number;
      console.log(`Created issue: ${issue.title}`);

      for (const tagId of issue.tags) {
        await db.run(
          "INSERT INTO issue_tags (issue_id, tag_id) VALUES (?, ?)",
          [issueId, tagId]
        );
      }
    }

    console.log("Database seeding completed successfully!");
    console.log("\nSample users created (sign in through the auth system):");
    console.log("- john@example.com (John Doe)");
    console.log("- jane@example.com (Jane Smith)");
    console.log("- admin@example.com (Admin User)");
    console.log("- dev@example.com (Developer)");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  } finally {
    await db.close();
  }
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedDatabase };
