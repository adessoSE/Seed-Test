import express from 'express';
import * as workgroupController from '../controllers/workgroup.controller.js';
import { authorizeRepo } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { addMemberSchema, updateMemberSchema, removeMemberSchema } from '@shared/schemas/workgroup.schemas.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Authorization: viewing members requires repo access, managing members requires ownership
const canRead = authorizeRepo('id');
const ownerOnly = authorizeRepo('id', { ownerOnly: true });

// --- Workgroup Member Routes ---

/**
 * @route   GET /api/workgroup/:id/members
 * @desc    Get all members (including owner) for a repository's workgroup
 * @access  Private (repo member)
 */
router.get('/:id/members', canRead, workgroupController.getMembers);

/**
 * @route   POST /api/workgroup/:id/members
 * @desc    Add a member to a repository's workgroup
 * @access  Private (owner only)
 */
router.post('/:id/members', ownerOnly, validate(addMemberSchema), workgroupController.addMember);

/**
 * @route   PUT /api/workgroup/:id/members
 * @desc    Update a member's status (e.g., canEdit) in a workgroup
 * @access  Private (owner only)
 */
router.put('/:id/members', ownerOnly, validate(updateMemberSchema), workgroupController.updateMemberStatus);

/**
 * @route   DELETE /api/workgroup/:id/members
 * @desc    Remove a member from a workgroup (using DELETE is more RESTful)
 * @access  Private (owner only)
 */
router.delete('/:id/members', ownerOnly, validate(removeMemberSchema), workgroupController.removeMember);


export default router;