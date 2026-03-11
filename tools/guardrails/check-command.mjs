import fs from "node:fs";
import path from "node:path";

const allowlistPath = path.resolve("tools/guardrails/command-allowlist.json");
const raw = fs.readFileSync(allowlistPath, "utf8");
const policy = JSON.parse(raw);
const command = process.argv.slice(2).join(" ").trim();

if (!command) {
  console.error("Usage: npm run guardrails:check -- <command>");
  process.exit(1);
}

for (const pattern of policy.blockedPatterns) {
  if (command.toLowerCase().includes(pattern.toLowerCase())) {
    console.error(`Blocked command pattern matched: ${pattern}`);
    process.exit(2);
  }
}

const isAllowed = policy.allowedPrefixes.some((prefix) =>
  command.toLowerCase().startsWith(prefix.toLowerCase())
);

if (!isAllowed) {
  console.error(`Command not allowlisted: ${command}`);
  process.exit(3);
}

console.log("Command approved by guardrails policy.");