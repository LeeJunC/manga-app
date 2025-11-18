const { MongoClient } = require("mongodb");
const uri = require("./atlas_uri");

console.log(uri); // This will print the URI to verify it's being imported correctly

const client = new MongoClient(uri);
const dbname = "bank";

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
  } catch(err){
    console.error('Error connecting to the database: ${err}');
  } finally{
    await client.close();
  }
};

// run main
main();
