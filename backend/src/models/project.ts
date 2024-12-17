import { ObjectId } from "mongodb"

enum Sources {
	GITHUB = "github",
	JIRA = "jira",
	DB = "db"
}

class Group {
	_id: ObjectId
	name: string
	member_stories: Array<string>
	isSequential: boolean
	xrayTestSet: boolean
}

class Project {
  _id?: string;
  repoName: string;
  stories: Array<string>;
  repoType: Sources;
  customBlocks: Array<string>;
  groups: Array<Group>;
  settings?: Settings;
}

class CustomProject extends Project{
    owner: ObjectId;
}

class JiraProject extends Project{
    //owner: string;  // deprecated - but in DB as ""
}

class XrayProject extends JiraProject{
    stepFields: Array<string>
}

class GitHubProject extends Project{
    gitOwner: number;
    owner: ObjectId;
}

class Settings {
    stepWaitTime: number  
    reportComment: boolean
    browser: string
    activated: boolean
    width: number
    height: number
  }

export {
    Sources,
    Group,
    Project,
    CustomProject,
    JiraProject,
    XrayProject,
    GitHubProject,
    Settings
};