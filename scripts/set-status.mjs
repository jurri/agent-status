import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const allowedStates = new Set([
  "idle",
  "working",
  "waiting",
  "error",
  "offline"
]);

const state = process.argv[2] ?? "idle";

if (!allowedStates.has(state)) {
  console.error("Invalid state:", state);
  console.error("Allowed states:");
  console.error([...allowedStates].join(", "));
  process.exit(1);
}

const file = join(homedir(), ".agent-status.json");

const payload = {
  agent: "Claude",
  state,
  message: state,
  updatedAt: new Date().toISOString()
};

writeFileSync(
  file,
  JSON.stringify(payload, null, 2),
  "utf8"
);

console.log("Wrote status file:");
console.log(file);
console.log(JSON.stringify(payload, null, 2));