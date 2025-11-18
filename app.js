const { MongoClient } = require("mongodb");
const uri = require("./atlas_uri");

console.log(uri); // This will print the URI to verify it's being imported correctly

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

const main = async () => {
  try{
    await connectToDatabase();
    console.log('Database connection successful');
    const db = client.db(dbname);
    const collection = db.collection('test_collection');
    
    console .log("\n--- Inserting a document ---");
    // Get admin database
    const adminDb = client.db().admin();
    
    // List all databases
    const databasesList = await adminDb.listDatabases();
    
    console.log("Your databases:");
    databasesList.databases.forEach((db) => {
      console.log(`- ${db.name} (${db.sizeOnDisk} bytes)`);
    });
  } catch(err){
    console.error('Error connecting to the database: ${err}');
  } finally{
    await client.close();
  }
};

// run main
main();
