const { MongoClient } = require("mongodb");
const uri = require("./atlas_uri");

const client = new MongoClient(uri);
const dbname = "manga";

const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log("Connected to database:", dbname);
    return client.db(dbname);
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
};

async function seed() {
    try { 
        await connectToDatabase();
        const db = client.db(dbname);
        const collection = db.collection('series');

        const sampleData = {
            title: "Kingdom", author: "Yasuhisa Hara", chapters: "856"
        }

        console.log("\n--- Inserted data ---");
        await collection.insertMany(sampleData);
    } finally{
        await client.close();
    }
}

seed();