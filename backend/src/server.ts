import { app } from "./app";
import { env } from "./config/env";

// Bind 0.0.0.0, not the default loopback: a container's health check and
// router reach the process from outside its own network namespace.
app.listen(env.port, "0.0.0.0", () => {
  console.log(`API listening on 0.0.0.0:${env.port}`);
});
