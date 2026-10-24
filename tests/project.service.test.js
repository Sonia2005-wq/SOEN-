import { test } from "node:test";
import assert from "node:assert/strict";
import esmock from "esmock";

test("createProject rejects a missing project name", async () => {
  const { createProject } = await esmock(
    "../Backend/services/project.sevice.js",
    {
      "../Backend/models/project.model.js": {
        default: {
          create: async () => {
            throw new Error("Database should not be called");
          },
        },
      },
    }
  );

  await assert.rejects(
    () => createProject({ userId: "507f1f77bcf86cd799439012" }),
    { message: "Name is required" }
  );
});

test("createProject rejects a missing user ID", async () => {
  const { createProject } = await esmock(
    "../Backend/services/project.sevice.js",
    {
      "../Backend/models/project.model.js": {
        default: {
          create: async () => {
            throw new Error("Database should not be called");
          },
        },
      },
    }
  );

  await assert.rejects(
    () => createProject({ name: "SOEN Test Project" }),
    { message: "User is required" }
  );
});

test("addUserToProject rejects an invalid project ID", async () => {
  const { addUserToProject } = await esmock(
    "../Backend/services/project.sevice.js",
    {
      "../Backend/models/project.model.js": {
        default: {
          findOne: async () => {
            throw new Error("Database should not be called");
          },
        },
      },
    }
  );

  await assert.rejects(
    () =>
      addUserToProject({
        projectId: "invalid-id",
        users: ["507f1f77bcf86cd799439013"],
        userId: "507f1f77bcf86cd799439012",
      }),
    { message: "Invalid projectId" }
  );
});
