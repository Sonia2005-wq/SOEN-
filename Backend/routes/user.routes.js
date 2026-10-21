import { Router } from 'express';
import { body } from 'express-validator';

import {
    createUserController,
    loginController,
    profileController,
    logoutController,
    getAllUsersController
} from '../controller/user.controller.js';

import { authUser } from '../middleware/auth.middleware.js';

const router = Router();

// ==================== REGISTER ====================
router.post(
    '/register',
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email'),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),

    createUserController
);

// ==================== LOGIN ====================
router.post(
    '/login',
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email'),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    loginController
);

// ==================== PROFILE ====================
router.get(
    '/profile',
    authUser,
    profileController
);

// ==================== LOGOUT ====================
router.post(
    '/logout',
    authUser,
    logoutController
);

// ==================== GET ALL USERS ====================
router.get(
    '/all',
    authUser,
    getAllUsersController
);

export default router;