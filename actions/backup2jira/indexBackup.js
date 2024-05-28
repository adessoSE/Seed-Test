// require('dotenv').config();
const { MongoClient, BSON } = require("mongodb");

// MongoDB URI and database details
const mongoURI = process.env.DATABASE_URI;
const dbName = "Seed";
const collectionNames = ["CustomBlocks"]; // Add other collection names here

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
      const collectionBSON = collectionData.map(o => BSON.serialize(o)); // Serialize each object
      data.push(new File(collectionBSON, `${collectionName}.json`));
    }

    //console.log("Retrieved MongoDB data:", data); // TODO: comment out pre-upload
    return data;
  } catch (error) {
    console.error("Error querying MongoDB data:", error.message);
    throw error;
  }
}
/**
 * 
 * @param {String} issueKey 
 * @param {Array} data 
 */
async function sendToJiraIssue(issueKey, data) {
  try {
    const jiraBaseUrl = "https://jira.adesso.de/rest/api/2";
    const attachmentUrl = `${jiraBaseUrl}/issue/${issueKey}/attachments`;

    const formData = new FormData();
    // Create a FormData object and append the data
    data.forEach(file => formData.append("file", file))
    

    // Make the POST request
    const response = await fetch(attachmentUrl, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${bearerToken}`, // Include your bearer token
        "X-Atlassian-Token": "nocheck",
        // Add any other necessary headers (e.g., authentication)
      },
      body: formData
    }).then(async res => await res.json());

    console.log("Attachment added successfully:", response);
  } catch (error) {
    console.error("Error adding attachment:", error.message);
  }
}


async function main() {
  let client;
  try {
    client = await connectToMongoDB();
    const data = await queryMongoData(client);
    await sendToJiraIssue('CUC-654', data)
    // Handle the data as needed (e.g., create a JSON object)
    console.log("Processed data:", data);
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
