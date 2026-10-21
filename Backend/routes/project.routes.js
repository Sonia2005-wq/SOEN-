import { Router } from "express";
import { body } from "express-validator";

import * as projectController from "../controller/project.controller.js";
import { authUser } from "../middleware/auth.middleware.js";

const router = Router();

// Create project
router.post(
    "/create",
    authUser,
    body("name")
        .isString()
        .withMessage("Project name must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Project name is required"),
    projectController.createProject
);

// Get all projects of logged-in user
router.get(
    "/all",
    authUser,
    projectController.getAllProject
);

// Add users to a project
router.put(
    "/add-user",
    authUser,
    body('projectId').isString().withMessage('ProjectId is required'), 
    body("user")
        .isArray({ min: 1 })
        .withMessage("User must be an array")
        .bail()
        .custom((users) =>
            users.every(user => typeof user === "string")
        )
        .withMessage("Every user must be a string"),
    projectController.addUserToProject
);

router.get('/get-project/:projectId', 
    authUser, 
    projectController.getProjectById
)
export default router;