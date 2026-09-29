import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const server = createApp(config);
server.listen(config.port, config.host, () => {
  console.log(`FMS Web System (${config.environment}, synthetic data) listening on ${config.origin}`);
});

function stop(signal) {
  console.log(`${signal} received; stopping.`);
  server.close((error) => { if (error) { console.error(error); process.exitCode = 1; } });
}
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
