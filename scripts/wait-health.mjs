for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const r = await fetch("http://localhost:5173/api/health");
    if (r.ok) process.exit(0);
  } catch {
    /* Retry while the server starts. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
throw new Error("Application did not become ready");
