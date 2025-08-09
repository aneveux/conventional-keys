const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const include = [
  "manifest.json",
  "content.js",
  "style.css",
  "icons"
];

const outputDir = "dist";
const output = path.join(outputDir, "conventional-keys.zip");

// Ensure dist/ exists
fs.mkdirSync(outputDir, { recursive: true });

// Build zip command
// Works on systems with `zip` installed (Linux, macOS, WSL)
// Avoids including hidden files like .git, .DS_Store, etc.
const zipCommand = `zip -r ${output} ${include.join(" ")} -x "*/.*"`;

try {
  execSync(zipCommand, { stdio: "inherit" });
  console.log(`🚀 Created ${output} successfully!`);
} catch (err) {
  console.error("😭 Error creating zip:", err.message);
  process.exit(1);
}

