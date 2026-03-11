const branch = process.env.GITHUB_REF_NAME || "";
const event = process.env.GITHUB_EVENT_NAME || "";

if (!branch) {
  console.log("No branch context found; skipping strict branch guard.");
  process.exit(0);
}

if (event === "push" && branch === "main") {
  console.error("Direct pushes to main are blocked by policy. Use PR workflow.");
  process.exit(1);
}

console.log(`Branch policy check passed for ${event}:${branch}`);