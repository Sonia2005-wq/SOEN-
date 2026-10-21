import userModel from '../models/user.model.js';
import * as userService from '../services/user.service.js';
import { validationResult } from 'express-validator';
import redisClient from '../services/redis.service.js';

// ==================== REGISTER USER ====================
export const createUserController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {
        // Create a new user through the service
        const user = await userService.createUser(req.body);

        // Generate JWT token
        const token = user.generateJWT();

        // Remove password from response
        const safeUser = user.toObject();
        delete safeUser.password;

        return res.status(201).json({
            message: 'User registered successfully',
            user: safeUser,
            token
        });

    } catch (error) {
        console.error('Register error:', error.message);

        return res.status(400).json({
            message: error.message
        });
    }
};


// ==================== LOGIN USER ====================
export const loginController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {
        const { email, password } = req.body;

        // Find user and include password
        const user = await userModel
            .findOne({ email })
            .select('+password');

        if (!user) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isMatch = await user.isValidPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        // Generate JWT
        const token = user.generateJWT();

        // Remove password from response
        const safeUser = user.toObject();
        delete safeUser.password;

        return res.status(200).json({
            message: 'Login successful',
            user: safeUser,
            token
        });

    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};


// ==================== USER PROFILE ====================
export const profileController = async (req, res) => {
    try {
        // req.user is set by the authentication middleware
        return res.status(200).json({
            message: 'Profile fetched successfully',
            user: req.user
        });

    } catch (error) {
        console.error('Profile error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};


// ==================== LOGOUT USER ====================
export const logoutController = async (req, res) => {
    try {
        // Get token from cookie or Authorization header
        const authHeader = req.headers.authorization;

        const token =
            req.cookies?.token ||
            (authHeader?.startsWith('Bearer ')
                ? authHeader.split(' ')[1]
                : null);

        if (!token) {
            return res.status(401).json({
                message: 'Token not found'
            });
        }

        // Add token to Redis blacklist for 24 hours
        await redisClient.set(
            token,
            'logout',
            'EX',
            60 * 60 * 24
        );

        // Clear cookie if cookie-based authentication is used
        res.clearCookie('token');

        return res.status(200).json({
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};


// ==================== GET ALL USERS ====================
export const getAllUsersController = async (req, res) => {
    try {
        // Find the logged-in user
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        });

        if (!loggedInUser) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // Get logged-in user's ID
        const userId = loggedInUser._id;

        // Fetch users through service
        const allUsers = await userService.getAllUsers({
            userId
        });

        return res.status(200).json({
            message: 'Users fetched successfully',
            users: allUsers
        });

    } catch (error) {
        console.error('Get all users error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};