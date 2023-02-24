import { Cipher, Decipher, scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
const mongo = require('../src/database/DbServices');
enum Sources {
    GITHUB = "github",
    JIRA = "jira",
    DB = "db"
}

class Group {
    _id: string
    name: string
    member_stories: Array<string>
    isSequential: boolean
}

class Repository {
    _id: string
    owner: string
    gitOwner: string
    stories: Array<string>
    repoType: Enumerator<Sources>
    customBlocks: Array<string>
    groups: Array<Group>
}

const cryptoAlgorithm = 'aes-256-ccm';
const key = scryptSync(process.env.JIRA_SECRET, process.env.JIRA_SALT, 32);


function jiraEncryptPassword(pass: string): Buffer[] {
    const nonce = randomBytes(13);
    const cipher = createCipheriv(cryptoAlgorithm, key, nonce, { authTagLength: 16 });
    const ciphertext = cipher.update(pass, 'utf8');
    cipher.final();
    const tag = cipher.getAuthTag();

    return [ciphertext, nonce, tag];
}

function jiraDecryptPassword(ciphertext: Buffer, nonce: Buffer, tag: Buffer): string {
    nonce = nonce ? nonce : Buffer.alloc(13, 0);
    try {
        const decipher = createDecipheriv(cryptoAlgorithm, key, nonce, { authTagLength: 16 });
        decipher.setAuthTag(tag);
        console.log("ciphertext", ciphertext);
        const receivedPlaintext = decipher.update(ciphertext, null, 'utf8');
        decipher.final();
        return receivedPlaintext;
    } catch (err) {
        console.log("Authentication Failed");// leaf in or replace with proper logging
        throw new Error('Authentication failed!');
    }
}

/**
 * get repo names from jira
 * @param jiraUser only jira part of user
 * @returns 
 */
async function getJiraRepos(jiraUser: any) {
    if(!jiraUser)return []
    let { Host, AccountName, Password, Password_Nonce, Password_Tag } = jiraUser;
    const jiraClearPassword = jiraDecryptPassword(Password, Password_Nonce, Password_Tag);
    const repos = await requestJiraRepos(Host, AccountName, jiraClearPassword);
    return await storeJiraRepos(repos)
}

/**
 * Makes the Request to fetch jira repos
 * @param host 
 * @param username 
 * @param jiraClearPassword 
 * @returns 
 */
async function requestJiraRepos(host: string, username: string, jiraClearPassword: string) {
    const auth = Buffer.from(`${username}:${jiraClearPassword}`).toString('base64');
    const reqoptions = {
        method: 'GET',
        qs: {
            type: 'page',
            title: 'title'
        },
        headers: {
            'cache-control': 'no-cache',
            Authorization: `Basic ${auth}`
        }
    };
    // use GET /rest/api/2/project instead of GET /rest/api/2/issue/createmeta
    // https://docs.atlassian.com/software/jira/docs/api/REST/7.6.1/#api/2/project-getAllProjects
    return await fetch(`http://${host}/rest/api/2/project`, reqoptions)
    .then((response) => response.json())
    .then(async (json) => {
        const projects = [];
        for (const project of json) {
            projects.push(project["name"])
        }
        return projects
    }).catch((error) => { console.error(error); return [] })
}

/**
 * store and  cumulate jira repos
 * @param projects 
 * @returns 
 */
async function storeJiraRepos(projects:Array<any>){
    const source = Sources.JIRA
    let repos = [];
    let jiraRepo;
    const jiraReposFromDb = await mongo.getAllSourceReposFromDb(source);
    if (projects.length !== 0) {
        for (const projectName of projects) {
            if (!jiraReposFromDb.some((entry) => entry.repoName === projectName)) {
                jiraRepo = await mongo.createJiraRepo(projectName.name);
            } else {
                jiraRepo = jiraReposFromDb.find((element) => element.repoName === projectName);
            }
            repos.push({ name: projectName, _id: jiraRepo._id });
        }
        return repos.map<{_id:string, value:string, source:string}>
        ((value) => ({
            _id: value._id.to,
            value: value.name,
            source
        }));
    }
}

async function updateJiraCredential(UserID: string, username: string, jiraClearPassword: string, host: string) {
    const [password, nonce, tag] = jiraEncryptPassword(jiraClearPassword);
    const jira = {
        AccountName: username,
        Password: password,
        Password_Nonce: nonce,
        Password_Tag: tag,
        Host: host
    };
    const user = await mongo.getUserData(UserID);
    user.jira = jira;
    await mongo.updateUser(UserID, user);
}

function fetchGithubRepos() {

}

function fetchDbRepos() {

}

module.exports = {
    jiraDecryptPassword,
    jiraEncryptPassword,
    getJiraRepos,
    updateJiraCredential
};
