import express from 'express';
import * as workgroupController from '../controllers/workgroup.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

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