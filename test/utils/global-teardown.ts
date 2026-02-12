import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalTeardown() {
  const mongod = global.__MONGOD__ as MongoMemoryServer;

  if (mongod) {
    await mongod.stop();
  }

  delete global.__MONGOD__;
}
