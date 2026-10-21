import * as projectService from '../services/project.sevice.js';
import { validationResult } from 'express-validator';
import userModel from '../models/user.model.js';

// ==================== CREATE PROJECT ====================
export const createProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {
        const { name } = req.body;

        // Find the logged-in user
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        });

        if (!loggedInUser) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const userId = loggedInUser._id;

        // Create project
        const newProject = await projectService.createProject({
            name,
            userId
        });

        return res.status(201).json(newProject);

    } catch (err) {
        console.error('Create project error:', err.message);

        return res.status(500).json({
            message: err.message || 'Internal server error'
        });
    }
};


// ==================== GET ALL PROJECTS ====================
export const getAllProject = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        });

        if (!loggedInUser) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const allUserProjects = await projectService.getAllProject({
            userId: loggedInUser._id
        });

        return res.status(200).json({
            projects: allUserProjects
        });

    } catch (err) {
        console.error('Get projects error:', err.message);

        return res.status(500).json({
            error: err.message
        });
    }
};


// ==================== ADD USER TO PROJECT ====================
export const addUserToProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {
        // Read projectId and user from request body
        const { projectId, user } = req.body;

        // Find the logged-in user
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        });

        if (!loggedInUser) {
            return res.status(404).json({
                message: 'Logged-in user not found'
            });
        }

        // Call service
        const project = await projectService.addUserToProject({
            projectId,
            users: user,
            userId: loggedInUser._id
        });

        return res.status(200).json({
            message: 'User(s) added to project successfully',
            project
        });

    } catch (err) {
        console.error('Add user to project error:', err.message);

        return res.status(400).json({
            error: err.message
        });
    }
};

export const getProjectById = async (req, res) => {
    const {projectId} = req.params; 

    try{
        const project = await projectService.getProjectById({
            projectId
        }); 

        return res.status(200).json({
            project
        })

    }
    catch(err){
        res.status(400).json({error: err.message})

    }
}