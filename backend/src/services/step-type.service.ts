import * as dbConnection from '../database/DbConnector.js';
import { type StepType } from '@seed-test/shared/models/StepType.js';

const stepTypesCollection = 'stepTypes';

/**
 * Fetches all available step type definitions from the database.
 * @returns A Promise that resolves to an array of StepType objects.
 */
export async function showSteptypes(): Promise<StepType[]> {
	const db = dbConnection.getConnection();
	return db.collection<StepType>(stepTypesCollection).find({}).toArray();
}