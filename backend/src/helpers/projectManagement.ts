const mongo = require('../src/database/DbServices');
const userMng = require('./userManagement')
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

/**
 * get repo names from jira
 * @param jiraUser only jira part of user
 * @returns 
 */
async function getJiraRepos(jiraUser: any) {
    if(!jiraUser)return []
    let { Host, AccountName, Password, Password_Nonce, Password_Tag } = jiraUser;
    const jiraClearPassword = userMng.jiraDecryptPassword(Password, Password_Nonce, Password_Tag);
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

function fetchGithubRepos() {

}

function fetchDbRepos() {

}

module.exports = {
    getJiraRepos
};
