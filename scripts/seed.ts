import { connect, migrate } from "../packages/database/client.js";
import { seedDemo } from "./seed-data.js";
const db = await connect();
try {
  await migrate(db);
  await seedDemo(db);
} finally {
  await db.close();
}
