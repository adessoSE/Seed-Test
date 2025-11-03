import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as workgroupController from '../controllers/workgroup.controller';

const router = express.Router();

// --- Basic Middleware (CORS, BodyParser, Headers, Logging) ---
// Authentication is assumed to be handled globally.
router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true
    }))
    .use(bodyParser.json({ limit: '100kb' }))
    .use(bodyParser.urlencoded({
        limit: '100kb',
        extended: true
    }))
    .use((req, res, next) => { // Standard Headers
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	})
    .use((_, __, next) => { // Simple request logging
        console.log('Time of workgroup router request:', Date.now());
        next();
    });

// --- Workgroup Member Routes ---

/**
 * @route   GET /api/workgroup/:id/members
 * @desc    Get all members (including owner) for a repository's workgroup
 * @access  Private
 */
router.get('/:id/members', workgroupController.getMembers);

/**
 * @route   POST /api/workgroup/:id/members
 * @desc    Add a member to a repository's workgroup
 * @access  Private
 */
router.post('/:id/members', workgroupController.addMember);

/**
 * @route   PUT /api/workgroup/:id/members
 * @desc    Update a member's status (e.g., canEdit) in a workgroup
 * @access  Private
 */
router.put('/:id/members', workgroupController.updateMemberStatus);

/**
 * @route   DELETE /api/workgroup/:id/members
 * @desc    Remove a member from a workgroup (using DELETE is more RESTful)
 * @access  Private
 */
router.delete('/:id/members', workgroupController.removeMember); // Changed from POST '/deletemember/:id'


export default router;