import esmock from "esmock";
import jwt from "jsonwebtoken";

import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../Backend/app.js';
import { createProject } from "../Backend/controller/project.controller.js";
test('GET / returns hello world from the actual SOEN app', async () => {
const response = await request(app).get('/');

assert.equal(response.status, 200);
assert.equal(response.text, 'hello world');

});

test('POST /user/register rejects an invalid email', async () => {
const response = await request(app)
.post('/user/register')
.send({
email: 'not-an-email',
password: 'password123'
});

assert.equal(response.status, 400);
assert.ok(Array.isArray(response.body.errors));

});

test('GET /user/profile rejects an unauthenticated request', async () => {
const response = await request(app).get('/user/profile');

assert.equal(response.status, 401);
assert.equal(response.body.err, 'Unauthenticated User');

});

test('POST /user/login rejects an invalid email', async () => {
    const response = await request(app)
        .post('/user/login')
        .send({
            email: 'invalid-email',
            password: 'password123'
        });

    assert.equal(response.status, 400);
    assert.ok(Array.isArray(response.body.errors));
});

test('GET /projects/all rejects an unauthenticated request', async () => {
    const response = await request(app).get('/projects/all');

    assert.equal(response.status, 401);
    assert.equal(response.body.err, 'Unauthenticated User');
});

test('GET /ai/get-result rejects an empty prompt', async () => {
    const response = await request(app)
        .get('/ai/get-result')
        .query({ prompt: '' });

    assert.equal(response.status, 500);
    assert.equal(
        response.body.message,
        'Prompt must be a non-empty string.'
    );
});

import { socketAuth } from "../Backend/middleware/socketAuth.middleware.js";

test("Socket.IO rejects a connection without a token", async () => {
  const socket = {
    handshake: {
      auth: {},
      headers: {},
      query: {},
    },
  };

  const error = await new Promise((resolve) => {
    socketAuth(socket, (err) => resolve(err));
  });

  assert.ok(error instanceof Error);
  assert.equal(error.message, "Authentication Error");
});

test("Socket.IO rejects an invalid project ID", async () => {
  const socket = {
    handshake: {
      auth: {
        token: "test-token",
      },
      headers: {},
      query: {
        projectId: "invalid-project-id",
      },
    },
  };

  const error = await new Promise((resolve) => {
    socketAuth(socket, (err) => resolve(err));
  });

  assert.ok(error instanceof Error);
  assert.equal(error.message, "Invalid projectId");
});

test("Socket.IO rejects an invalid JWT", async () => {
  const socket = {
    handshake: {
      auth: {
        token: "invalid.jwt.token",
      },
      headers: {},
      query: {
        projectId: "507f1f77bcf86cd799439011",
      },
    },
  };

  const error = await new Promise((resolve) => {
    socketAuth(socket, (err) => resolve(err));
  });

  assert.ok(error instanceof Error);
  assert.ok(
    ["jwt malformed", "invalid token"].includes(error.message)
  );
});

test("Socket.IO rejects a valid token when user is not a project member", async () => {
  const secret = "soen-test-secret";

  process.env.SECRET = secret;

  const projectId = "507f1f77bcf86cd799439011";
  const userId = "507f191e810c19729de860ea";
  const anotherUserId = "507f1f77bcf86cd799439012";

  // Create a valid JWT for a user who is NOT a project member
  const token = jwt.sign(
    {
      _id: userId,
      email: "test@example.com",
    },
    secret
  );

  // Mock project model so MongoDB is not required
  const mockedProjectModel = {
    findById: async () => ({
      _id: projectId,
      users: [anotherUserId],
    }),
  };

  // Load middleware with mocked project model
  const { socketAuth: mockedSocketAuth } = await esmock(
    "../Backend/middleware/socketAuth.middleware.js",
    {
      "../Backend/models/project.model.js": {
        default: mockedProjectModel,
      },
    }
  );

  const socket = {
    handshake: {
      auth: { token },
      headers: {},
      query: { projectId },
    },
  };

  let receivedError;

  await mockedSocketAuth(socket, (error) => {
    receivedError = error;
  });

  assert.ok(receivedError);
  assert.equal(
    receivedError.message,
    "You are not authorized to access this project"
  );
});


test("Socket.IO rejects authentication when the project does not exist", async () => {
  const secret = "soen-test-secret";
  process.env.SECRET = secret;

  const projectId = "507f1f77bcf86cd799439011";
  const userId = "507f191e810c19729de860ea";

  const token = jwt.sign(
    { _id: userId, email: "test@example.com" },
    secret
  );

  // Mock: database mein project nahi mila
  const mockedProjectModel = {
    findById: async () => null,
  };

  const { socketAuth: mockedSocketAuth } = await esmock(
    "../Backend/middleware/socketAuth.middleware.js",
    {
      "../Backend/models/project.model.js": {
        default: mockedProjectModel,
      },
    }
  );

  const socket = {
    handshake: {
      auth: { token },
      headers: {},
      query: { projectId },
    },
  };

  let receivedError;

  await mockedSocketAuth(socket, (error) => {
    receivedError = error;
  });

  assert.ok(receivedError);
  assert.equal(receivedError.message, "Project not found");
});



test("Socket.IO authenticates a project member successfully", async () => {
  const secret = "soen-test-secret";
  process.env.SECRET = secret;

  const projectId = "507f1f77bcf86cd799439011";
  const userId = "507f191e810c19729de860ea";

  const token = jwt.sign(
    { _id: userId, email: "test@example.com" },
    secret
  );

  const mockProject = {
    _id: projectId,
    name: "SOEN Test Project",
    users: [userId],
  };

  const mockedProjectModel = {
    findById: async () => mockProject,
  };

  const { socketAuth: mockedSocketAuth } = await esmock(
    "../Backend/middleware/socketAuth.middleware.js",
    {
      "../Backend/models/project.model.js": {
        default: mockedProjectModel,
      },
    }
  );

  const socket = {
    handshake: {
      auth: { token },
      headers: {},
      query: { projectId },
    },
  };

  let receivedError;

  await mockedSocketAuth(socket, (error) => {
    receivedError = error;
  });

  assert.equal(receivedError, undefined);
  assert.equal(socket.project, mockProject);
  assert.equal(socket.user._id, userId);
  assert.equal(socket.user.email, "test@example.com");
});

test("createProject rejects invalid request data", async () => {
  const req = {
    body: {},
  };

  const res = {
    statusCode: 200,
    body: undefined,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },
  };

  // Controller validationResult(req) ko use karta hai.
  // Isliye actual Express validator result ko mock karenge.
  const { createProject: mockedCreateProject } = await esmock(
    "../Backend/controller/project.controller.js",
    {
      "express-validator": {
        validationResult: () => ({
          isEmpty: () => false,
          array: () => [{ msg: "Project name is required" }],
        }),
      },
      "../Backend/services/project.sevice.js": {
        createProject: async () => {
          throw new Error("Service should not be called");
        },
      },
      "../Backend/models/user.model.js": {
        default: {
          findOne: async () => {
            throw new Error("User model should not be called");
          },
        },
      },
    }
  );

  await mockedCreateProject(req, res);

  assert.equal(res.statusCode, 400);
  assert.ok(Array.isArray(res.body.errors));
  assert.equal(res.body.errors[0].msg, "Project name is required");
});


test("getAllProject returns 404 when the logged-in user does not exist", async () => {
  const { getAllProject: mockedGetAllProject } = await esmock(
    "../Backend/controller/project.controller.js",
    {
      "express-validator": {
        validationResult: () => ({
          isEmpty: () => true,
          array: () => [],
        }),
      },
      "../Backend/models/user.model.js": {
        default: {
          findOne: async () => null,
        },
      },
      "../Backend/services/project.sevice.js": {
        getAllProject: async () => {
          throw new Error("Project service should not be called");
        },
      },
    }
  );

  const req = {
    user: {
      email: "missing@example.com",
    },
  };

  const res = {
    statusCode: 200,
    body: undefined,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },
  };

  await mockedGetAllProject(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "User not found");
});

test("getProjectById returns the requested project", async () => {
  const projectId = "507f1f77bcf86cd799439011";

  const mockProject = {
    _id: projectId,
    name: "SOEN Test Project",
    users: [],
  };

  const { getProjectById: mockedGetProjectById } = await esmock(
    "../Backend/controller/project.controller.js",
    {
      "../Backend/services/project.sevice.js": {
        getProjectById: async ({ projectId: requestedId }) => {
          assert.equal(requestedId, projectId);
          return mockProject;
        },
      },
    }
  );

  const req = {
    params: { projectId },
  };

  const res = {
    statusCode: 200,
    body: undefined,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },
  };

  await mockedGetProjectById(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    project: mockProject,
  });
});



test("addUserToProject adds users successfully", async () => {
  const projectId = "507f1f77bcf86cd799439011";
  const loggedInUserId = "507f1f77bcf86cd799439012";
  const userToAdd = "507f1f77bcf86cd799439013";

  const mockProject = {
    _id: projectId,
    users: [loggedInUserId, userToAdd],
  };

  const { addUserToProject: mockedAddUserToProject } = await esmock(
    "../Backend/controller/project.controller.js",
    {
      "express-validator": {
        validationResult: () => ({
          isEmpty: () => true,
          array: () => [],
        }),
      },

      "../Backend/models/user.model.js": {
        default: {
          findOne: async ({ email }) => {
            assert.equal(email, "sonia@example.com");

            return {
              _id: loggedInUserId,
            };
          },
        },
      },

      "../Backend/services/project.sevice.js": {
        addUserToProject: async ({ projectId: receivedProjectId, users, userId }) => {
          assert.equal(receivedProjectId, projectId);
          assert.deepEqual(users, [userToAdd]);
          assert.equal(userId, loggedInUserId);

          return mockProject;
        },
      },
    }
  );

  const req = {
    body: {
      projectId,
      user: [userToAdd],
    },
    user: {
      email: "sonia@example.com",
    },
  };

  const res = {
    statusCode: 200,
    body: undefined,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },
  };

  await mockedAddUserToProject(req, res);

  assert.equal(res.statusCode, 200);

  assert.deepEqual(res.body, {
    message: "User(s) added to project successfully",
    project: mockProject,
  });
});

test("addUserToProject returns 404 when the logged-in user does not exist", async () => {
  const { addUserToProject: mockedAddUserToProject } = await esmock(
    "../Backend/controller/project.controller.js",
    {
      "express-validator": {
        validationResult: () => ({
          isEmpty: () => true,
          array: () => [],
        }),
      },

      "../Backend/models/user.model.js": {
        default: {
          findOne: async () => null,
        },
      },

      "../Backend/services/project.sevice.js": {
        addUserToProject: async () => {
          throw new Error("Project service should not be called");
        },
      },
    }
  );

  const req = {
    body: {
      projectId: "507f1f77bcf86cd799439011",
      user: ["507f1f77bcf86cd799439013"],
    },
    user: {
      email: "missing@example.com",
    },
  };

  const res = {
    statusCode: 200,
    body: undefined,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },
  };

  await mockedAddUserToProject(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Logged-in user not found");
});

test("addUserToProject returns 400 when the project service fails", async () => {
  const { addUserToProject: mockedAddUserToProject } = await esmock(
    "../Backend/controller/project.controller.js",
    {
      "express-validator": {
        validationResult: () => ({
          isEmpty: () => true,
          array: () => [],
        }),
      },

      "../Backend/models/user.model.js": {
        default: {
          findOne: async () => ({
            _id: "507f1f77bcf86cd799439012",
          }),
        },
      },

      "../Backend/services/project.sevice.js": {
        addUserToProject: async () => {
          throw new Error("User does not belong to this project");
        },
      },
    }
  );

  const req = {
    body: {
      projectId: "507f1f77bcf86cd799439011",
      user: ["507f1f77bcf86cd799439013"],
    },
    user: {
      email: "sonia@example.com",
    },
  };

  const res = {
    statusCode: 200,
    body: undefined,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },
  };

  await mockedAddUserToProject(req, res);

  assert.equal(res.statusCode, 400);

  assert.deepEqual(res.body, {
    error: "User does not belong to this project",
  });
});
