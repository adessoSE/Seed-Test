import { type Request, type Response, type NextFunction } from 'express';
import { type User } from '@seed-test/shared/models/User.js';
import * as externalAccountService from '../services/externalAccount.service.js';
import { logger } from '../logging.js';
import { AppError } from '../helpers/AppError.js';
import { requireSafeExternalHost } from '../utils/validation.js';

/**
 * Handles linking/updating Jira credentials for the logged-in user.
 */
export async function linkJiraCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const user = req.user as User;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!user?._id)
			throw AppError.unauthorized('User not authenticated');

		const body = req.body as Record<string, unknown>;
		// Bearer tokens have no account name (the Bearer tab does not send one), so it defaults to ''
		const jiraAccountName = (body.jiraAccountName as string | undefined) ?? '';
		const jiraPassword = body.jiraPassword as string;
		const jiraHost = body.jiraHost as string;
		const jiraAuthMethod = body.jiraAuthMethod as string | undefined;
		// Basic-requires-accountName is enforced by linkJiraSchema in the validate() middleware; not repeated here
		if (!jiraPassword || !jiraHost)
			throw AppError.badRequest('Missing Jira credentials (accountName, password, host)');

		requireSafeExternalHost(jiraHost);

		// --- Verification Logic ---
		const authString = externalAccountService.buildAuthString(jiraAccountName, jiraPassword, jiraAuthMethod);
		const options = { method: 'GET', headers: { 'Authorization': authString }};
		const jiraURL = `https://${jiraHost}/rest/auth/1/session`;
		const response = await fetch(jiraURL, options);
		if (!response.ok)
			throw AppError.badGateway(`Jira credential verification failed: ${response.statusText}`);
        
		// --- End Verification ---

		await externalAccountService.updateJiraCredential(
			user._id.toString(),
			jiraAccountName,
			jiraPassword,
			jiraHost,
			jiraAuthMethod ?? 'bearer'
		);

		res.status(200).json({ message: 'Jira credentials updated successfully.' });

	} catch (error) {
		logger.error(`Error linking Jira credentials: ${String(error)}`);
		// Provide more specific feedback if possible

		if (error instanceof Error && error.message.includes('verification failed')) 
			next(new Error('Invalid Jira username, password, or host.')); // Pass specific error
		else 
			next(error); // Pass other errors to central handler
        
	}
}

/**
 * Handles disconnecting the Jira account linkage for the logged-in user.
 */
export async function disconnectJira(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const user = req.user as User;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!user?._id)
			throw AppError.unauthorized('User not authenticated');

		await externalAccountService.disconnectJira(user._id.toString());

		res.status(200).json({ message: 'Jira account disconnected successfully.' });

	} catch (error) {
		next(error);
	}
}

/**
 * Handles logging into Jira to obtain a session cookie (legacy?).
 * Note: This might be less common with PAT/Bearer tokens.
 */
export async function jiraLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const body = req.body as Record<string, unknown>;
		// Bearer logins have no account name; jiraLoginSchema requires it only for AuthMethod 'basic'
		const jiraAccountName = (body.jiraAccountName as string | undefined) ?? '';
		const jiraPassword = body.jiraPassword as string;
		const jiraServer = body.jiraServer as string;
		const AuthMethod = body.AuthMethod as string | undefined;
		if (!jiraPassword || !jiraServer)
			throw AppError.badRequest('Missing Jira credentials for login');

		requireSafeExternalHost(jiraServer);

		const authString = externalAccountService.buildAuthString(jiraAccountName, jiraPassword, AuthMethod);
		const options = {
			method: 'GET',
			headers: { 'Authorization': authString }
		};

		const response = await fetch(`https://${jiraServer}/rest/auth/1/session`, options);

		if (!response.ok) {
			logger.info('Failed to log in to Jira-Server.');
			throw AppError.unauthorized('Failed to log in to Jira-Server.');
		}

		// Extract session cookie if present (often JSESSIONID)
		const setCookieHeader = response.headers.get('set-cookie');
		if (setCookieHeader) {
			// Basic extraction, might need refinement based on actual header format
			const sessionCookie = setCookieHeader.split(';')[0];
			res.status(200).json({ sessionCookie });
		} else 
		// Successful auth but no cookie? Might indicate API token usage.
			res.status(200).json({ message: 'Authentication successful, but no session cookie set.' });
        
	} catch (error) {
		next(error);
	}
}

/**
 * Handles updating the status of an Xray test step via Jira API.
 */
export async function updateXrayStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const user = req.user as User;
		if (!user.jira)
			throw AppError.unauthorized('User not authenticated or Jira not linked.');

		// Use the IssueTracker class for decryption
		const clearPass = externalAccountService.jiraDecryptPassword(
			user.jira.Password,
			user.jira.Password_Nonce,
			user.jira.Password_Tag
		);
		const { AccountName, AuthMethod, Host } = user.jira;
		// Re-validate stored host to guard against DB-level tampering
		requireSafeExternalHost(Host);
		const authString = externalAccountService.buildAuthString(AccountName, clearPass, AuthMethod);

		const body = req.body as Record<string, unknown>;
		const testRunId = body.testRunId as string;
		const stepId = body.stepId as string;
		const status = body.status as string;
		if (!testRunId || !stepId || !status)
			throw AppError.badRequest('Missing testRunId, stepId, or status');

		// Construct URL safely
		const url = new URL(`https://${Host}/rest/raven/1.0/api/testrun/${testRunId}/step/${stepId}/status`);
		url.searchParams.append('status', status);

		const options = {
			method: 'PUT',
			headers: {
				'Authorization': authString,
				'Content-Type': 'application/json'
			}
		};

		const response = await fetch(url.toString(), options);

		if (!response.ok) {
			const errorBody = await response.text();
			throw AppError.badGateway(`HTTP error! status: ${response.status}, body: ${errorBody}`);
		}

		// Check content type before parsing JSON
		let data: Record<string, unknown> = { message: 'Success', status: response.status };
		const contentType = response.headers.get('content-type');
		if (contentType?.includes('application/json')) {
			const text = await response.text();
			if (text)  // Avoid parsing empty responses
				data = JSON.parse(text) as Record<string, unknown>;
            
		}
		res.status(response.status).json(data);

	} catch (error) {
		logger.error(`Error while updating Xray status: ${String(error)}`);
		next(error);
	}
}