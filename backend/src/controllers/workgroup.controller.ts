import { Request, Response, NextFunction } from 'express';
import { requireValidId } from '../utils/validation.js';
import * as workgroupService from '../services/workgroup.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../helpers/AppError.js';

/**
 * Handles fetching all members (including owner) of a workgroup for a given repository.
 */
export async function getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = req.params.id;
		requireValidId(repoId, 'repository ID');

		const members = await workgroupService.getMembers(repoId);
		res.status(200).json(members);
	} catch (error) {
		next(error);
	}
}

/**
 * Handles adding a new member to a workgroup.
 */
export async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = req.params.id;
		requireValidId(repoId, 'repository ID');

		// Ensure email is lowercase and validate user exists
		const userToAdd = {
			email: req.body.email.toLowerCase(),
			canEdit: req.body.canEdit || false // Default to false if not provided
		};
        
		const existingUser = await userService.getUserByEmail(userToAdd.email);
		if (!existingUser)
			throw AppError.notFound('No user found with this email');

		// Check if the user is the owner (cannot add owner as member)
		const currentMembers = await workgroupService.getMembers(repoId);
		if (currentMembers.owner.email === userToAdd.email)
			throw AppError.badRequest('Cannot add the repository owner as a member');

		// The service handles checking for existing members and creating the workgroup if needed
		const result = await workgroupService.addMember(repoId, userToAdd);
		res.status(200).json(result);

	} catch (error: any) {
		// Handle specific error from the service (e.g., user already exists)
		if (error.message === 'This user is already in the work group')
			throw AppError.conflict(error.message);

		next(error);
	}
}

/**
 * Handles updating a member's edit status within a workgroup.
 */
export async function updateMemberStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = req.params.id;
		requireValidId(repoId, 'repository ID');

		const userToUpdate = {
			email: req.body.email.toLowerCase(),
			canEdit: req.body.canEdit // Should be provided
		};

		// Optional: Check if user exists before updating? Service might handle this implicitly.
        
		const result = await workgroupService.updateMemberStatus(repoId, userToUpdate);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

/**
 * Handles removing a member from a workgroup.
 */
export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const repoId = req.params.id;
		requireValidId(repoId, 'repository ID');

		// The user object might be nested differently in the original JS request body
		const userToRemove = {
			email: req.body.email?.email?.toLowerCase() || req.body.email?.toLowerCase() // Handle potential nesting
		};
        
		if (!userToRemove.email)
			throw AppError.badRequest('Email of the member to remove is required.');

		const result = await workgroupService.removeFromWorkgroup(repoId, userToRemove);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}