import mongoose from "mongoose";
import projectModel from "../models/project.model.js";

export const createProject = async ({ name, userId }) => {
  if (!name) {
    throw new Error("Name is required");
  }
  if (!userId) {
    throw new Error("User is required");
  }

  const project = await projectModel.create({
    name,
    users: [userId],
  });
  return project;
};

export const getAllProject = async ({ userId }) => {
  if (!userId) {
    throw new Error("UserId is required");
  }

  const allUserProjects = await projectModel.find({
    users: userId,
  });
  return allUserProjects;
};

export const addUserToProject = async ({ projectId, users, userId }) => {
  if (!projectId) {
    throw new Error("ProjectId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid projectId");
  }

  if (!users) {
    throw new Error("Users are required");
  }

  if (
    !Array.isArray(users) ||
    users.some((userId) => !mongoose.Types.ObjectId.isValid(userId))
  ) {
    throw new Error("Invalid usrId in users array");
  }

  if (!userId) {
    throw new Error("userId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const project = await projectModel.findOne({
    _id: projectId,
    users: userId,
  });

  if (!project) {
    throw new Error("User does not belong to this project ");
  }

  const updatedProject = await projectModel.findOneAndUpdate(
    {
      _id: projectId,
    },
    {
      $addToSet: {
        users: {
          $each: users,
        },
      },
    },
    {
      new: true,
    },
  );

  return updatedProject; 
};

export const getProjectById = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await projectService.getProjectById({
      projectId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Check whether the logged-in user belongs to this project
    const userId = req.user._id;

    const isMember = project.users.some(
      (member) => member._id.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not authorized to access this project",
      });
    }

    return res.status(200).json({
      project,
    });
  } catch (err) {
    return res.status(400).json({
      error: err.message,
    });
  }
};