require('dotenv').config();
const { MongoClient } = require("mongodb");
const { EJSON } = require('bson')

// MongoDB URI and database details
const mongoURI = process.env.DATABASE_URI;
const dbName = "Seed";
const collectionNames = ["Stories", "Repositories", "CustomBlocks", "User", "Workgroups"];

const jiraBaseUrl = "https://jira.adesso.de/rest/api/2";
const jiraProjKey = 'CUC'
const bearerToken = process.env.JIRA_TOKEN

async function connectToMongoDB() {
  try {
    const client = new MongoClient(mongoURI);
    await client.connect();
    console.log("Connected to MongoDB");
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    throw error;
  }
}

async function queryMongoData(client) {
  try {
    const db = client.db(dbName);
    const data = [];

    for (const collectionName of collectionNames) {
      const collection = db.collection(collectionName);
      const collectionData = await collection.find().toArray();
      const collectionBSON = collectionData.map(o => EJSON.stringify(o)); // Serialize each (individual)object
      //console.log(collectionData)
      const file = new File(collectionBSON, `${collectionName}.json`);
      data.push(file);
    }

    console.log("Retrieved MongoDB data:", data);
    return data;
  } catch (error) {
    console.error("Error querying MongoDB data:", error.message);
    throw error;
  }
}

async function createJiraIssue(projectKey) {
  try {
    const attachmentUrl = `${jiraBaseUrl}/issue`;

    const today = new Date()
    
    // Append issue details to formData
    const issueData = { fields: {
      project: { key: projectKey },
      summary: `DB-Backup ${today.toLocaleDateString()}`,
      description: `Backup of Database Collections for Project Seed-Test`,
      // fixVersion: {id:1002},
      labels: ['DB-Backup'],
      issuetype: {
        name: "Service Request"
      }
    }};

    // Make the POST request
    const response = await fetch(attachmentUrl, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(issueData)
    });

    if(response.ok){
      const content = await response.json();
      console.log("Issue created: ", content.key);
      return content.key;
    }
    throw Error(`creating Issue no ok ${response.status}`)

  } catch (error) {
    console.error("Failed Creating Issue. Reason:", error.message);
  }
}


/**
 * 
 * @param {String} issueKey 
 * @param {Array} data 
 */
async function sendToJiraIssue(issueKey, data) {
  try {
    const attachmentUrl = `${jiraBaseUrl}/issue/${issueKey}/attachments`;

    const formData = new FormData();
    // Create a FormData object and append the data
    data.forEach(file => formData.append("file", file))
    

    // Make the POST request
    const response = await fetch(attachmentUrl, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${bearerToken}`, // Include your bearer token
        "X-Atlassian-Token": "nocheck"
      },
      body: formData
    }).then(async res => await res.json());
    delete response?.author

    if(response.errorMessages) throw Error(`add attachment no ok ${response.errorMessages}, Issue: ${issueKey}`);
    return response;
    
  } catch (error) {
    console.error("Error adding attachment:", error.message);
  }
}


async function main() {
  let client;
  try {
    client = await connectToMongoDB();
    const data = await queryMongoData(client);
    const issueKey = await createJiraIssue(jiraProjKey);
    const attachResult = await sendToJiraIssue(issueKey, data)
    if(attachResult&&data) console.log("Successfully created DB Backup: ", issueKey);
    throw Error("Something went wrong see earlier errors")
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (client) {
      client.close();
      console.log("Disconnected from MongoDB");
    }
  }
}

main();
