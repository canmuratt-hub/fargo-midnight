import fs from "node:fs";
import path from "node:path";

const mode = process.argv[2];

if (mode === "clean") {
  fs.rmSync("dist", { recursive: true, force: true });
} else if (mode === "copy-managed") {
  copyDir("src/managed", "dist/managed");
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
