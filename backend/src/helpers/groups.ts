import * as mongoTs from "../database/projectDBServices"
import { ObjectId } from 'mongodb';
import {Sources, CustomProject, JiraProject, Group } from "../models/project";
import mongo from "../../src/database/DbServices";
import dbConnector from "../../src/database/DbConnector";
import emptyScenario from "../../src/models/emptyScenario";
import emptyBackground from "../../src/models/emptyBackground";
import { Collections } from '../database/Collections';

/**
 * Creates a new story group in the database.
 * @param {string} repoID - The repository ID.
 * @param {string} name - The name of the group.
 * @param {Array<string>} members - The member stories.
 * @param {boolean} sequence - Whether the group is sequential.
 *  * @param {boolean} xrayTestSet - Whether the group is an Xray test set.
 * @param {any} session - Optional session for DB transactions.
 * @param {any} client - Optional client for DB transactions.
 * @returns {Promise<string | null>} - The ID of the created group or null if an error occurs.
 */
async function createStoryGroup(
  repoID: string,
  name: string,
  members: Array<string>,
  sequence: boolean,
  xrayTestSet: boolean = false,
  session?: any,
  client?: any
): Promise<string | null> {
  try {
    const db = (session && client) ? client.db('Seed', session) : dbConnector.getConnection();

    const group: Group = {
      _id: new ObjectId(),
      name,
      member_stories: members,
      isSequential: sequence,
      xrayTestSet
    };

    const dbEntry = await db.collection(Collections.REPOSITORIES).findOneAndUpdate(
      { _id: new ObjectId(repoID) },
      { $push: { groups: group } },
      { upsert: true, projection: { groups: 1 }, session: session || undefined }
    );
    // Error?
    return dbEntry.value.groups.slice(-1)[0]._id;
  } catch (error) {
    console.error(`ERROR in createStoryGroup:\n`, error);
    return null;
  }
}

/**
 * Updates a story group in the database.
 * @param {string} repoId - The repository ID.
 * @param {string} groupId - The group ID.
 * @param {Group} updatedGroup - The updated group.
 * @param {any} session - Optional session for DB transactions.
 * @param {any} client - Optional client for DB transactions.
 * @returns {Promise<Group | null>} - The updated group or null if an error occurs.
 */
async function updateStoryGroup(
  repoId: string,
  groupId: string,
  updatedGroup: Group,
  session?: any,
  client?: any
): Promise<Group | null> {
  try {
    const db = (session && client) ? client.db('Seed', session) : dbConnector.getConnection();
    updatedGroup._id = new ObjectId(updatedGroup._id);
    const collection = await db.collection(Collections.REPOSITORIES);
    const repo = await collection.findOne({ _id: new ObjectId(repoId) });
    const index = repo.groups.findIndex((o: Group) => o._id.toString() === groupId);
    repo.groups[index] = updatedGroup;
    await collection.updateOne(
      { _id: new ObjectId(repoId) },
      { $set: repo },
      { session: session || undefined }
    );
    return updatedGroup;
  } catch (e) {
    console.error(`ERROR in updateStoryGroup: ${e}`);
    return null;
  }
}

/**
 * Updates the story groups array in the database.
 * @param {string} repoId - The repository ID.
 * @param {Array<Group>} groupsArray - The array of groups.
 * @returns {Promise<void>} - A promise that resolves when the update is complete.
 */
async function updateStoryGroupsArray(repoId: string, groupsArray: Array<Group>): Promise<void> {
  try {
    const db = dbConnector.getConnection();
    await db.collection(Collections.REPOSITORIES).findOneAndUpdate(
      { _id: new ObjectId(repoId) },
      { $set: { groups: groupsArray } },
      { projection: { groups: 1 } }
    );
  } catch (e) {
    console.error(`ERROR in updateStoryGroupsArray: ${e}`);
  }
}

/**
 * Deletes a story group from the database.
 * @param {string} repoId - The repository ID.
 * @param {string} groupId - The group ID.
 * @returns {Promise<void>} - A promise that resolves when the deletion is complete.
 */
async function deleteStoryGroup(repoId: string, groupId: string): Promise<void> {
  try {
    const db = dbConnector.getConnection();
    const collection = await db.collection(Collections.REPOSITORIES);
    const repo = await collection.findOne({ _id: new ObjectId(repoId) });
    const index = repo.groups.findIndex((o: Group) => o._id.toString() === groupId);
    repo.groups.splice(index, 1);
    await collection.updateOne({ _id: new ObjectId(repoId) }, { $set: repo });
  } catch (e) {
    console.error(`ERROR in deleteStoryGroup: ${e}`);
  }
}

/**
 * Gets all story groups from the database.
 * @param {string} repoId - The repository ID.
 * @returns {Promise<Array<Group>>} - The array of groups.
 */
async function getAllStoryGroups(repoId: string): Promise<Array<Group>> {
  try {
    const db = dbConnector.getConnection();
    const repo = await db.collection(Collections.REPOSITORIES).findOne(
      { _id: new ObjectId(repoId) },
      { projection: { groups: 1 } }
    );
    return repo.groups;
  } catch (e) {
    console.error(`ERROR in getAllStoryGroups: ${e}`);
    return [];
  }
}

/**
 * Gets a story group by ID from the database.
 * @param {string} repoId - The repository ID.
 * @param {string} groupId - The group ID.
 * @returns {Promise<Group | null>} - The group or null if not found.
 */
async function getOneStoryGroup(repoId: string, groupId: string): Promise<Group | null> {
  try {
    const groups = await getAllStoryGroups(repoId);
    return groups.find((o: Group) => o._id.toString() === groupId) || null;
  } catch (e) {
    console.error(`ERROR in getOneStoryGroup: ${e}`);
    return null;
  }
}

/**
 * Adds a story to a group in the database.
 * @param {string} repoId - The repository ID.
 * @param {string} groupId - The group ID.
 * @param {string} storyId - The story ID.
 * @returns {Promise<Group | null>} - The updated group or null if an error occurs.
 */
async function addToStoryGroup(repoId: string, groupId: string, storyId: string): Promise<Group | null> {
  try {
    const group = await getOneStoryGroup(repoId, groupId);
    if (!group) return null;
    group.member_stories.push(storyId);
    await updateStoryGroup(repoId, groupId, group);
    return group;
  } catch (e) {
    console.error(`ERROR in addToStoryGroup: ${e}`);
    return null;
  }
}

/**
 * Removes a story from a group in the database.
 * @param {string} repoId - The repository ID.
 * @param {string} groupId - The group ID.
 * @param {string} storyId - The story ID.
 * @returns {Promise<Group | null>} - The updated group or null if an error occurs.
 */
async function removeFromStoryGroup(repoId: string, groupId: string, storyId: string): Promise<Group | null> {
  try {
    const group = await getOneStoryGroup(repoId, groupId);
    if (!group) return null;
    group.member_stories = group.member_stories.filter((id) => id !== storyId);
    await updateStoryGroup(repoId, groupId, group);
    return group;
  } catch (e) {
    console.error(`ERROR in removeFromStoryGroup: ${e}`);
    return null;
  }
}

export {
  createStoryGroup,
  updateStoryGroup,
  updateStoryGroupsArray,
  deleteStoryGroup,
  getAllStoryGroups,
  getOneStoryGroup,
  addToStoryGroup,
  removeFromStoryGroup
};



