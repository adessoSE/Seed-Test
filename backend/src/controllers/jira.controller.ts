import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { User } from '@shared/models/User';
import * as externalAccountService from '../services/externalAccount.service';

/**
 * Handles linking/updating Jira credentials for the logged-in user.
 */
export async function linkJiraCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = req.user as User;
        if (!user?._id) { /* ... */ }
        const { jiraAccountName, jiraPassword, jiraHost, jiraAuthMethod } = req.body;
        if (!jiraAccountName || !jiraPassword || !jiraHost) { /* ... */ }
        if (!/^[.:a-zA-Z0-9]+$/.test(jiraHost)) { /* ... */ }

        // --- Verification Logic ---
        const authString = externalAccountService.buildAuthString(jiraAccountName, jiraPassword, jiraAuthMethod);
        const options = { method: 'GET', headers: { 'Authorization': authString }};
        const jiraURL = `https://${jiraHost}/rest/auth/1/session`;
        const response = await fetch(jiraURL, options);
        if (!response.ok) {
            throw new Error(`Jira credential verification failed: ${response.statusText}`);
        }
        // --- End Verification ---

        await externalAccountService.updateJiraCredential(
            user._id.toString(),
            jiraAccountName,
            jiraPassword,
            jiraHost,
            jiraAuthMethod || 'bearer'
        );

        res.status(200).json({ message: 'Jira credentials updated successfully.' });

    } catch (error) {
        console.error('Error linking Jira credentials:', error);
        // Provide more specific feedback if possible
        if (error instanceof Error && error.message.includes('verification failed')) {
            next(new Error('Invalid Jira username, password, or host.')); // Pass specific error
        } else {
            next(error); // Pass other errors to central handler
        }
    }
}

/**
 * Handles disconnecting the Jira account linkage for the logged-in user.
 */
export async function disconnectJira(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = req.user as User;
        if (!user?._id) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }

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
        const { jiraAccountName, jiraPassword, jiraServer, AuthMethod } = req.body;
         if (!jiraAccountName || !jiraPassword || !jiraServer) {
            res.status(400).json({ error: 'Missing Jira credentials for login' });
            return;
        }
        if (!/^[.:a-zA-Z0-9]+$/.test(jiraServer)) {
            res.status(400).json({ error: 'Invalid Jira Host format.' });
            return;
        }

        const authString = externalAccountService.buildAuthString(jiraAccountName, jiraPassword, AuthMethod);
        const options = {
            method: 'GET',
            headers: { 'Authorization': authString }
        };

        const response = await fetch(`https://${jiraServer}/rest/auth/1/session`, options);

        if (!response.ok) {
             console.log('Failed to log in to Jira-Server.');
             res.status(401).json({ error: 'Failed to log in to Jira-Server.' });
             return;
        }

        // Extract session cookie if present (often JSESSIONID)
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            // Basic extraction, might need refinement based on actual header format
            const sessionCookie = setCookieHeader.split(';')[0];
            res.status(200).json({ sessionCookie });
        } else {
            // Successful auth but no cookie? Might indicate API token usage.
             res.status(200).json({ message: 'Authentication successful, but no session cookie set.' });
        }
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
        if (!user?.jira) {
            res.status(401).json({ error: 'User not authenticated or Jira not linked.' });
            return;
        }

        // Use the IssueTracker class for decryption
        const clearPass = externalAccountService.jiraDecryptPassword(
            user.jira.Password,
            user.jira.Password_Nonce,
            user.jira.Password_Tag
        );
        const { AccountName, AuthMethod, Host } = user.jira;
        const authString = externalAccountService.buildAuthString(AccountName, clearPass, AuthMethod);

        const { testRunId, stepId, status } = req.body;
        if (!testRunId || !stepId || !status) {
             res.status(400).json({ error: 'Missing testRunId, stepId, or status' });
             return;
        }

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
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        // Check content type before parsing JSON
        let data: any = { message: 'Success', status: response.status };
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const text = await response.text();
            if (text) { // Avoid parsing empty responses
                data = JSON.parse(text);
            }
        }
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Error while updating Xray status:', error);
        next(error);
    }
}