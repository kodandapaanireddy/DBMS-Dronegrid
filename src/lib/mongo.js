import { MongoClient } from 'mongodb';

let client;
let db;

/**
 * Connect to MongoDB (singleton).
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getMongo() {
  if (db) return db;
  const url = process.env.MONGO_URL || 'mongodb://mongo:mongo@localhost:27017/dronegrid';
  client = new MongoClient(url);
  await client.connect();
  db = client.db();
  return db;
}

/**
 * Close the Mongo client.
 * @returns {Promise<void>}
 */
export async function closeMongo() {
  if (client) await client.close();
  client = undefined;
  db = undefined;
}