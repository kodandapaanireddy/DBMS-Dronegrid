import { MongoClient } from 'mongodb';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/dronegrid';
process.argv = ['node', 'seed.js'];
await import('./seed.js');
