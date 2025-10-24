/* eslint-disable consistent-return */
/* eslint-disable line-comment-position */
/* eslint-disable no-param-reassign */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-await-in-loop */
/* eslint-disable curly */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
const { ObjectId } = require('mongodb');
const str = require('string-to-stream');
const toString = require('stream-to-string');
const assert = require('assert');
const mongodb = require('mongodb');
const fs = require('fs');
const Collection = require('mongodb/lib/collection');
const AdmZip = require('adm-zip');
const os = require('os');
const dbConnection = require('./DbConnector');
const emptyStory = require('../models/emptyStory');
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const userCollection = 'User';
const storiesCollection = 'Stories';
const repositoriesCollection = 'Repositories';
const stepTypesCollection = 'stepTypes';
const PwResetReqCollection = 'PwResetRequests';
const CustomBlocksCollection = 'CustomBlocks';
const WorkgroupsCollection = 'Workgroups';
const ReportDataCollection = 'ReportData';
const ReportsCollection = 'Reports';

// TODO: die eigene Methode replace kann oft durch die MongoMethode findOneAndReplace ersetzt werden!

// Opening a pooling Database Connection via DbConnector
dbConnection
	.establishConnection()
	.then(() => console.log(
		'\x1b[32m%s\x1b[0m \x1b[33m%s\x1b[0m',
		'Connected to database @',
		dbConnection.getConnection().client.s.options.srvHost
	));

function mongoSanitize(v) { // from https://github.com/vkarpov15/mongo-sanitize
	if (v instanceof Object) {
		for (const key in v) {
			if (/^\$/.test(key)) {
				delete v[key];
			} else {
				mongoSanitize(v[key]);
			}
		}
	}
	return v;
}


module.exports = {
	getFileList,
	getFiles,
	fileUpload,
	deleteFile,
	setIsSavedTestReport,
	deleteReport,
	getTestReports,
	getGroupTestReports,
	getReportByName,
	getReportById,
	getReportDataById,
	uploadReport,
	disconnectGithub,
	mergeGithub,
	findOrRegisterGithub,
	getUserByGithub,
	getUserById,
	registerUser,
	getUserByEmail,
	showSteptypes,
	deleteBackground,
	updateBackground,
	getOneScenario,
	createScenario,
	updateScenario,
	deleteScenario,
	updateScenarioList,
	createStory,
	deleteStory,
	insertStoryIdIntoRepo,
	getOneStory,
	upsertEntry,
	updateStory,
	deleteUser,
	updateUser,
	getUserData,
	createJiraRepo,
	updateStoriesArrayInRepo,
	getRepository,
	deleteRepository,
	removeUserFromAllWorkgroups,
	getOneRepository,
	getOneGitRepository,
	getOneJiraRepository,
	getAllStoriesOfRepo,
	createRepo,
	createStoryGroup,
	updateStoryGroup,
	deleteStoryGroup,
	addToStoryGroup,
	removeFromStoryGroup,
	getAllStoryGroups,
	getOneStoryGroup,
	updateStoryGroupsArray,
	createResetRequest,
	getResetRequest,
	deleteRequest,
	getResetRequestByEmail,
	saveBlock,
	updateBlock,
	getBlock,
	getBlocks,
	deleteBlock,
	getWorkgroup,
	addMember,
	updateMemberStatus,
	getMembers,
	removeFromWorkgroup,
	updateOneDriver,
	updateScenarioStatus,
	updateStoryStatus,
	getAllSourceReposFromDb,
	createGitRepo,
	updateOwnerInRepo,
	updateRepository,
	getOneRepositoryById,
	getRepoSettingsById,
	getRepoAiConfigById,
	importStories,
	importBlocks,
	importGroups,
	getStoriesByIssueKeys,
	getOneStoryByIssueKey
};
