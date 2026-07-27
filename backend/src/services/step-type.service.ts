import * as dbConnection from '../database/DbConnector.js';
import { StepType } from '@shared/models/StepType.js';

const stepTypesCollection = 'stepTypes';

/**
 * Fetches all available step type definitions from the database.
 * @returns A Promise that resolves to an array of StepType objects.
 */
export async function showSteptypes(): Promise<StepType[]> {
	const db = dbConnection.getConnection();
	return await db.collection<StepType>(stepTypesCollection).find({}).toArray();
}