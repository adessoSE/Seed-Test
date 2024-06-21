require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Replace the connection string with your actual MongoDB URI

const uri = process.env.DATABASE_URI;

async function connectToMongoDB() {
    try {
        const client = await MongoClient.connect(uri);
        console.log('Connected to MongoDB successfully!');
        const db = client.db('Seed');
        const storiesCollection = db.collection('Stories')
        
        await storiesCollection.updateMany(
            { "scenarios.stepDefinitions.example": { $ne: [] }, "scenarios.multipleScenarios": { $exists: true } /*, _id: new ObjectId('664c582d84184c54c7124520') */},
            [ { $set: { "scenarios.multipleScenarios": { $map: { input: "$scenarios.stepDefinitions.example", as: "ex", in: { values: "$$ex.values" } } } } } ]
        )

        // Close the connection when done
        await client.close();
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

connectToMongoDB();
