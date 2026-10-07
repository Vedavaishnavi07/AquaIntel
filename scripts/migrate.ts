import { connect, migrate } from "../packages/database/client.js";
const db = await connect();
try {
  await migrate(db);
  console.log("Migrations applied");
} finally {
  await db.close();
}
