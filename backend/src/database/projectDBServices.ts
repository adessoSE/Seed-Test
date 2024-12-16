import { ObjectId } from 'mongodb';
import dbConnector from "../../src/database/DbConnector";
import { Sources, Project, JiraProject, CustomProject, GitHubProject, Settings } from '../models/project';
import { Collections } from './Collections';

/**
 * Creates a new project in the database.
 *
 * @param {string} ownerId - user ID of the project owner.
 * @param {string} name - The name of the project.
 * @param {any} session - Optional session for DB transactions.
 * @param {any} client - Optional client for DB transactions.
 * @returns {Promise<string>} - The ID of the created project.
 * @throws Will throw an error if the database operation fails.
 */
export async function createCustomProject(ownerId: string, name: string, session?: any, client?: any): Promise<string> {
  try {
    const newProject: CustomProject = {
      owner: new ObjectId(ownerId),
      repoName: name,
      stories: [],
      repoType: Sources.DB,
      customBlocks: [],
      groups: []
    };
    const db = session ? client.db('Seed', session) : dbConnector.getConnection();
    const collection = await db.collection(Collections.REPOSITORIES);
    const query = { owner: new ObjectId(ownerId), repoName: name };
    const existingProject = await collection.findOne(query);

    if (existingProject !== null || !name) return 'You already have a project with this name!';
    return collection.insertOne(newProject, { session: session || undefined })
  } catch (e) {
    console.error(`ERROR in createProject${e}`);
    throw e;
  }
}

/**
 * Creates a new Jira project in the database.
 *
 * @param {string} projectName - The name of the project.
 * @returns {Promise<JiraProject>} - The created Jira project.
 * @throws Will throw an error if the database operation fails.
 */
export async function createJiraProject(projectName: string): Promise<JiraProject> {
  try {
    const db = dbConnector.getConnection();
    const jiraProject: JiraProject = {
      repoName: projectName,
      repoType: Sources.JIRA,
      stories: [],
      customBlocks: []
    };
    return await db.collection(Collections.REPOSITORIES).insertOne(jiraProject);
  } catch (e) {
    console.error(`ERROR in createJiraProject ${e}`);
    throw e;
  }
}

/**
 * Creates a new GitHub project in the database.
 *
 * @param {number} gitOwnerId - The GitHub owner ID.
 * @param {string} repoName - The name of the repository.
 * @param {number} userGithubId - The GitHub user ID.
 * @param {string} userId - The user ID.
 * @returns {Promise<GitHubProject>} - The created GitHub project.
 * @throws Will throw an error if the database operation fails.
 */
export async function createGitProject(gitOwnerId: number, repoName: string, userGithubId: number, userId: string): Promise<GitHubProject> {
  try {
    const db = dbConnector.getConnection();
    const newRepo: GitHubProject = {
		// If the seed-User is the GitHub owner of the repo, set seed-User as owner
		owner: userGithubId === gitOwnerId ? new ObjectId(userId) : undefined,
		gitOwner: gitOwnerId,
		repoName,
		stories: [],
		repoType: Sources.GITHUB,
		customBlocks: []
    };
    return await db.collection(Collections.REPOSITORIES).insertOne(newRepo);
  } catch (e) {
    console.error(`ERROR in createGitRepo ${e}`);
    throw e;
  }
}

/**
 * Gets all projects of a user.
 *
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Project[]>} - The projects of the user.
 * @throws Will throw an error if the database operation fails.
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  try {
    const db = dbConnector.getConnection();
    const userObjectId = new ObjectId(userId);
    const user = await db.collection(Collections.USER).findOne({ _id: userObjectId });
    const repoCollection = await db.collection(Collections.REPOSITORIES);
    const wGCollection = await db.collection(Collections.WORKGROUPS);

    const positiveWorkgroups = await wGCollection
      .find({ Members: { $elemMatch: { email: user.email, canEdit: true } } })
      .toArray();
    const PWgArray = positiveWorkgroups.map((workgroup) => new ObjectId(workgroup.Repo));
    const PWgRepos = await repoCollection.find({ _id: { $in: PWgArray } }).toArray();
    PWgRepos.forEach((element) => {
      element.canEdit = true;
    });

    const negativeWorkgroups = await wGCollection
      .find({ Members: { $elemMatch: { email: user.email, canEdit: false } } })
      .toArray();
    const NWgArray = negativeWorkgroups.map((workgroup) => new ObjectId(workgroup.Repo));
    const NWgRepos = await repoCollection.find({ _id: { $in: NWgArray } }).toArray();
    NWgRepos.forEach((element) => {
      element.canEdit = false;
    });

    const userRepos = await repoCollection.find({ owner: userObjectId }).toArray();
    userRepos.forEach((element) => {
      element.canEdit = true;
    });

    return userRepos.concat(PWgRepos, NWgRepos);
  } catch (e) {
    console.error(`ERROR in getUserProjects: ${e}`);
    throw e;
  }
}

/**
 * Gets a project by owner ID and name.
 *
 * @param {string} ownerId - The ID of the owner.
 * @param {string} name - The name of the project.
 * @returns {Promise<Project>} - The project.
 * @throws Will throw an error if the database operation fails.
 */
export async function getOneProject(ownerId: string, name: string): Promise<Project> {
  try {
    const project = { owner: new ObjectId(ownerId), repoName: name };
    const db = dbConnector.getConnection();
    return db.collection(Collections.REPOSITORIES).findOne(project);
  } catch (e) {
    console.error(`ERROR in getOneProject ${e}`);
    throw e;
  }
}

/**
 * Gets a project by ID.
 *
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<Project>} - The project.
 * @throws Will throw an error if the database operation fails.
 */
export async function getOneProjectById(projectId: string): Promise<Project> {
  try {
    const project = { _id: new ObjectId(projectId) };
    const db = dbConnector.getConnection();
    return db.collection(Collections.REPOSITORIES).findOne(project);
  } catch (e) {
    console.error(`ERROR in getOneProjectById ${e}`);
    throw e;
  }
}

/**
 * Gets a GitHub project by name.
 *
 * @param {string} name - The name of the project.
 * @returns {Promise<GitHubProject | null>} - The GitHub project or null if not found.
 * @throws Will throw an error if the database operation fails.
 */
export async function getOneGitProject(name: string): Promise<GitHubProject | null> {
  try {
    const query = { repoName: name, repoType: Sources.GITHUB };
    const db = dbConnector.getConnection();
    return await db.collection(Collections.REPOSITORIES).findOne(query);
  } catch (e) {
    console.error(`ERROR in getOneGitProject ${e}`);
    throw e;
  }
}

/**
 * Gets a Jira project by name.
 *
 * @param {string} name - The name of the project.
 * @returns {Promise<JiraProject | null>} - The Jira project or null if not found.
 * @throws Will throw an error if the database operation fails.
 */
export async function getOneJiraProject(name: string): Promise<JiraProject | null> {
  try {
    const query = { repoName: name, repoType: Sources.JIRA };
    const db = dbConnector.getConnection();
    return await db.collection(Collections.REPOSITORIES).findOne(query);
  } catch (e) {
    console.error(`ERROR in getOneJiraProject ${e}`);
    throw e;
  }
}

/**
 * Gets all projects of a specific source.
 *
 * @param {string} source - The source of the projects.
 * @returns {Promise<Project[]>} - The projects.
 * @throws Will throw an error if the database operation fails.
 */
export async function getAllSourceProjectsFromDb(source: string): Promise<Project[]> {
  try {
    const db = dbConnector.getConnection();
    return await db
      .collection(Collections.REPOSITORIES)
      .find({ repoType: source })
      .toArray();
  } catch (e) {
    console.error(`ERROR in getAllSourceProjectsFromDb ${e}`);
    throw e;
  }
}

/**
 * Gets the settings of a project by ID.
 *
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<Settings | null>} - The settings of the project or null if not found.
 * @throws Will throw an error if the database operation fails.
 */
export async function getProjectSettingsById(projectId: string): Promise<Settings | null> {
  if (!projectId || projectId.length !== 24) {
    console.error(`Invalid project ID: ${projectId}. Must be a 24-character hex string.`);
    return null;
  }

  try {
    const db = dbConnector.getConnection();
    const collection = await db.collection(Collections.REPOSITORIES);

    // Safely create ObjectId from validated hex string
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      console.log(`No project found with the ID: ${projectId}`);
      return null;
    }
    return project.settings;
  } catch (e) {
    console.error(`Error retrieving project settings: ${e}`);
    throw e;
  }
}

/**
 * Updates a project in the database.
 *
 * @param {string} projectId - The ID of the project.
 * @param {string} newName - The new name of the project.
 * @param {any} globalSettings - The new global settings of the project.
 * @returns {Promise<Project>} - The updated project.
 * @throws Will throw an error if the database operation fails.
 */
export async function updateProject(projectId: string, newName: string, globalSettings: any): Promise<Project> {
  try {
    const projectFilter = { _id: new ObjectId(projectId) };
    const db = dbConnector.getConnection();
    const collection = await db.collection(Collections.REPOSITORIES);

    const updateFields: Partial<Project> = {};
    if (newName !== undefined) updateFields.repoName = newName;
    if (globalSettings !== undefined) updateFields.settings = globalSettings;

    const updatedProject = await collection.findOneAndUpdate(
      projectFilter,
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    return updatedProject.value;
  } catch (e) {
    console.error(`ERROR updateProject: ${e}`);
    throw e;
  }
}

/**
 * Updates the owner of a project in the database.
 *
 * @param {string} repoId - The ID of the project.
 * @param {string} newOwnerId - The ID of the new owner.
 * @param {string} oldOwnerId - The ID of the old owner.
 * @returns {Promise<string>} - Success message.
 * @throws Will throw an error if the database operation fails.
 */
export async function updateOwnerInProject(repoId: string, newOwnerId: string, oldOwnerId: string): Promise<string> {
  try {
    const db = dbConnector.getConnection();
    const oldOwner = await db.collection(Collections.USER).findOne({ _id: new ObjectId(oldOwnerId) });
    const newOwner = await db.collection(Collections.USER).findOne({ _id: new ObjectId(newOwnerId) });

    await db.collection(Collections.REPOSITORIES).findOneAndUpdate(
      { _id: new ObjectId(repoId) },
      { $set: { owner: new ObjectId(newOwnerId) } }
    );

    await db.collection(Collections.WORKGROUPS).findOneAndUpdate(
      { Repo: new ObjectId(repoId) },
      { $pull: { Members: { email: newOwner.email } } }
    );

    const wgMember = { email: oldOwner.email, canEdit: true };
    await db.collection(Collections.WORKGROUPS).findOneAndUpdate(
      { Repo: new ObjectId(repoId) },
      { $set: { owner: newOwner.email }, $push: { Members: wgMember } }
    );

    return 'Success';
  } catch (e) {
    console.error(`ERROR in updateOwnerInProject ${e}`);
    throw e;
  }
}

/**
 * Deletes a project in the database.
 *
 * @param {string} projectId - The ID of the project.
 * @param {string} ownerId - The ID of the owner.
 * @returns {Promise<any>} - The result of the deletion.
 * @throws Will throw an error if the database operation fails.
 */
export async function deleteProject(projectId: string, ownerId: string): Promise<any> {
  try {
    const db = dbConnector.getConnection();
    const collectionProject = await db.collection(Collections.REPOSITORIES);
    return collectionProject.deleteOne({
      owner: new ObjectId(ownerId),
      _id: new ObjectId(projectId)
    });
  } catch (e) {
    console.error(`ERROR in deleteProject ${e}`);
    throw e;
  }
}

module.exports = {
  createCustomProject,
  createJiraProject,
  createGitProject,
  getUserProjects,
  getOneProject,
  getOneProjectById,
  getOneGitProject,
  getOneJiraProject,
  getAllSourceProjectsFromDb,
  getProjectSettingsById,
  updateProject,
  updateOwnerInProject,
  deleteProject
}
