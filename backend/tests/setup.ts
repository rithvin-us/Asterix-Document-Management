import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach } from "vitest";
import { User } from "../src/models/User.js";
import { Bill } from "../src/models/Bill.js";
import { Subsystem } from "../src/models/Subsystem.js";
import { Vendor } from "../src/models/Vendor.js";
import { Report } from "../src/models/Report.js";

let mongod: MongoMemoryServer | undefined;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Build indexes up front (including Subsystem's collated unique index) so concurrency/race
  // tests exercise real database-level guarantees, not a window where the index doesn't exist yet.
  await Promise.all([User.init(), Bill.init(), Subsystem.init(), Vendor.init(), Report.init()]);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  // Optional-chained: if beforeAll failed to start mongod, an unguarded .stop() throws a
  // "Cannot read properties of undefined" teardown error that buries the real startup failure.
  await mongod?.stop();
});
