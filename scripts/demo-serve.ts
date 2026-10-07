// Dedicated local demonstration database; never target DATABASE_URL from a real environment.
if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL)
  throw new Error("Demo refuses production or external database configuration");
process.env.DEMO_MODE = "true";
process.env.LOCAL_DATA_DIR = ".local/demo-postgres";
process.env.UPLOAD_DIR = ".local/demo-uploads";
process.env.SERVE_BUILD = "true";
await import("../apps/server/index.js");

export {};
