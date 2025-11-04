import { ClientSession, MongoClient, ObjectId } from 'mongodb';
import AdmZip from "adm-zip";
import * as repositoryService from './repository.service';
import * as storyService from './story.service';
import * as blockService from './block.service';
import * as dbConnector from '../database/DbConnector';
import { Story } from '@shared/models/Story';
import { Block } from '@shared/models/Block';
import { Group } from '@shared/models/Group';
import { Repository } from '@shared/models/Repository';

// --- Main Import/Export Functions ---

/**
 * Exports an entire project (repository) into a zip file buffer.
 * It exports all documents as they are, including their original _ids,
 * to enable a robust re-import mapping process.
 * @param repo_id The ID of the repository to export.
 * @returns A Promise that resolves to the zip file as a Buffer.
 */
export async function exportProject(repo_id: string): Promise<Buffer> {
    const repo = await repositoryService.getOneRepositoryById(repo_id);
    if (!repo) {
        throw new Error("Repository not found.");
    }

    const stories = await storyService.getAllStoriesOfRepo(repo_id);
    const repoBlocks = await blockService.getBlocks(repo_id);
    
    const zip = new AdmZip();

    // Add all documents to the zip file in their respective folders, using their ID as filename
    stories.forEach(story => {
        zip.addFile(`stories/${story._id}.json`, Buffer.from(JSON.stringify(story)));
    });
    repoBlocks.forEach(block => {
        zip.addFile(`blocks/${block._id}.json`, Buffer.from(JSON.stringify(block)));
    });
    repo.groups.forEach(group => {
        zip.addFile(`groups/${group._id}.json`, Buffer.from(JSON.stringify(group)));
    });
    
    zip.addFile("repository.json", Buffer.from(JSON.stringify(repo)));
    return zip.toBuffer();
}

/**
 * Handles the entire project import process from a zip file within a database transaction.
 * It supports two modes: 'rename' (adds a suffix to conflicting items) and 'overwrite' (replaces existing items).
 * @param file The zip file buffer from the request.
 * @param repoId Optional ID of an existing repository to import into.
 * @param projectName Optional name for a new repository.
 * @param importMode True to rename conflicts (default), false to overwrite them.
 * @returns A promise that resolves to an object indicating success.
 */
export async function importProject(
    file: { buffer: Buffer },
    repoId?: string,
    projectName?: string,
    importMode: boolean | string = true // Default to rename mode
): Promise<{ success: boolean }> {
    const client = await dbConnector.establishConnection();
    const session = client.startSession();
    const zip = new AdmZip(file.buffer);
    
    const isRenameMode = (importMode === true || importMode === 'true');

    try {
        if (repoId && repoId !== "undefined") {
            // --- Logic for importing into an EXISTING project ---
            await session.withTransaction(async (currentSession) => {
                await processImport(zip, isRenameMode, repoId, undefined, client, currentSession);
            });
        } else {
            // --- Logic for importing into a NEW project ---
            if (!projectName) throw new Error("Project name is required for new imports.");
            
            await session.withTransaction(async (currentSession) => {
                const repoData: Repository = JSON.parse(zip.readAsText("repository.json"));
                
                // 1. Create the new repository with the new name and original owner
                const newRepoIdResult = await repositoryService.createRepo(repoData.owner, projectName, currentSession, client);
                if (typeof newRepoIdResult === 'string') throw new Error(newRepoIdResult);
                const newRepoId = newRepoIdResult.toHexString();

                // 2. Immediately update the new repository with settings from the imported file
                await repositoryService.updateRepository(newRepoId, undefined, repoData.settings, repoData.aiConfig);

                // 3. Process the rest of the import (stories, blocks, groups)
                await processImport(zip, isRenameMode, newRepoId, projectName, client, currentSession);
            });
        }
        return { success: true };
    } finally {
        await session.endSession();
        // The client connection is managed by the DbConnector, no need to close here.
    }
}

// --- Internal Helper Functions ---

/**
 * Central orchestrator for the import process. Manages transactions and data mapping.
 */
async function processImport(zip: AdmZip, isRenameMode: boolean, repoId: string, repoName: string | undefined, client: MongoClient, session: ClientSession) {
    // --- OPTIMIZATION: Fetch all existing names ONCE ---
    const [existingStories, existingBlocks, existingGroups] = await Promise.all([
        storyService.getAllStoriesOfRepo(repoId),
        blockService.getBlocks(repoId),
        repositoryService.getAllStoryGroups(repoId)
    ]);
    const existingStoryNames = new Set(existingStories.map(s => s.title));
    const existingBlockNames = new Set(existingBlocks.map(b => b.name));
    const existingGroupNames = new Set(existingGroups.map(g => g.name));

    const storyEntries = zip.getEntries().filter(e => e.entryName.startsWith('stories/'));
    const groupEntries = zip.getEntries().filter(e => e.entryName.startsWith('groups/'));
    const blockEntries = zip.getEntries().filter(e => e.entryName.startsWith('blocks/'));
    
    const oldToNewStoryIdMap = new Map<string, ObjectId>();

    // 1. Process Stories
    for (const entry of storyEntries) {
        const storyObject: Story = JSON.parse(zip.readAsText(entry));
        const oldId = storyObject._id?.toString();
        let newStoryId: ObjectId;

        const hasConflict = existingStoryNames.has(storyObject.title);

        if (!isRenameMode && hasConflict) { // OVERWRITE
            const existingStory = existingStories.find(s => s.title === storyObject.title);
            newStoryId = new ObjectId(existingStory!._id);
            await storyService.updateStory({ ...storyObject, _id: newStoryId }, client, session);
        } else { // RENAME or NO CONFLICT
            if (isRenameMode && hasConflict) {
                storyObject.title = findAvailableName(storyObject.title, existingStoryNames);
            }
            newStoryId = await storyService.createStory(storyObject.title, storyObject.body, repoId, client, session);
            await storyService.updateStory({ ...storyObject, _id: newStoryId }, client, session);
            await repositoryService.insertStoryIdIntoRepo(newStoryId.toHexString(), repoId, client, session);
        }
        if (oldId) oldToNewStoryIdMap.set(oldId, newStoryId);
    }
    
    // 2. Process Blocks
    for (const entry of blockEntries) {
        const blockObject: Block = JSON.parse(zip.readAsText(entry));
        delete blockObject._id;
        blockObject.repositoryId = repoId;
        blockObject.repository = repoName;
        const hasConflict = existingBlockNames.has(blockObject.name!);

        if (!isRenameMode && hasConflict) { // OVERWRITE
            const existingBlock = existingBlocks.find(b => b.name === blockObject.name);
            await blockService.updateBlock(existingBlock!._id, blockObject, session, client);
        } else { // RENAME or NO CONFLICT
            if (isRenameMode && hasConflict) {
                blockObject.name = findAvailableName(blockObject.name!, existingBlockNames);
            }
            await blockService.saveBlock(blockObject, session, client);
        }
    }
    
    // 3. Process Groups
    for (const entry of groupEntries) {
        const groupObject: Group = JSON.parse(zip.readAsText(entry));
        groupObject.member_stories = groupObject.member_stories.map(oldId => oldToNewStoryIdMap.get(oldId.toString())!).filter(Boolean);
        const hasConflict = existingGroupNames.has(groupObject.name);

        if (!isRenameMode && hasConflict) { // OVERWRITE
            const existingGroup = existingGroups.find(g => g.name === groupObject.name);
            await repositoryService.updateStoryGroup(repoId, existingGroup!._id, groupObject, client, session);
        } else { // RENAME or NO CONFLICT
            if (isRenameMode && hasConflict) {
                groupObject.name = findAvailableName(groupObject.name, existingGroupNames);
            }
            await repositoryService.createStoryGroup(repoId, groupObject.name, groupObject.member_stories.map(id => id.toString()), groupObject.isSequential, groupObject.xrayTestSet, client, session);
        }
    }
}

function findAvailableName(name: string, existingNames: Set<string>): string {
    let newName = name;
    let suffix = 1;
    while (existingNames.has(newName)) {
        newName = `${name}_${suffix++}`;
    }
    // Add the new name to the set for the current transaction to avoid duplicate names within the same import
    existingNames.add(newName); 
    return newName;
}