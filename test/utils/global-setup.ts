import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();

  process.env.MONGODB_URI = mongod.getUri();
  process.env.ENV = 'test';
  process.env.NODE_ENV = 'test';

  global.__MONGOD__ = mongod;
}
