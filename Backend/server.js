import dns from "node:dns";

dns.setServers(["8.8.8.8"]);

import jwt from "jsonwebtoken";
import "dotenv/config";
import http from "node:http";
import app from "./app.js";
import connect from "./db/db.js";
import { Server } from "socket.io";
import mongoose from "mongoose";
import projectModel from "./models/project.model.js";
import { generateResult } from "./services/ai.service.js";

const port = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization?.split(" ")[1];

    const projectId = socket.handshake.query.projectId;

    // 1. Check token
    if (!token) {
      return next(new Error("Authentication Error"));
    }

    // 2. Validate project ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new Error("Invalid projectId"));
    }

    // 3. Verify JWT
    const decoded = jwt.verify(token, process.env.SECRET);

    // 4. Find project
    const project = await projectModel.findById(projectId);

    if (!project) {
      return next(new Error("Project not found"));
    }

    // 5. Extract user ID from JWT
    const userId = decoded._id || decoded.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return next(new Error("Invalid user in token"));
    }

    // 6. Check project membership
    const isMember = project.users.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return next(
        new Error("You are not authorized to access this project")
      );
    }

    // 7. Store verified data on socket
    socket.project = project;
    socket.user = {
      ...decoded,
      _id: userId,
    };

    next();
  } catch (error) {
    next(error);
  }
});

// Socket connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const roomId = socket.project._id.toString();

  socket.join(roomId);

  socket.on("project-message", async (data) => {
    try {
      if (!data || typeof data.message !== "string" || !data.message.trim()) {
        return;
      }

      const message = data.message.trim();

      // Send the user's message to other project members
      socket.broadcast.to(roomId).emit("project-message", {
        ...data,
        sender: {
          _id: socket.user._id,
          email: socket.user.email,
        },
      });

      // Check whether the message mentions AI

      if (/^@ai\b/i.test(message)) {
        const prompt = message.replace(/^@ai\b/i, "").trim();

        if (!prompt) return;

        if (!prompt) return;

        console.log("AI prompt:", prompt);

        // Generate AI response
        const result = await generateResult(prompt);

        if (!result) {
          throw new Error("Gemini returned an empty response.");
        }

        console.log("AI result received:", result);

        // Send AI response to everyone in the project room
        io.to(roomId).emit("project-message", {
          message: result,
          sender: {
            _id: "@ai",
            email: "AI",
          },
        });
      }
    } catch (error) {
      console.error("Project message error:", error);

      socket.emit("project-message-error", {
        message: error.message || "AI response could not be generated.",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server — outside io.on()
async function startServer() {
  try {
    console.log("Connecting to MongoDB...");

    await connect();

    console.log("Database connection successful!");

    server.listen(port, () => {
      console.log(`Server is running on ${port}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
