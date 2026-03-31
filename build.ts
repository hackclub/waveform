import { cpSync, mkdirSync } from "fs";

// Clean and create output directory
mkdirSync("public", { recursive: true });

// Bundle TypeScript files
await Bun.build({
  entrypoints: ["src/js/main.ts", "src/js/tutorial.ts"],
  outdir: "public/js",
  format: "esm",
  minify: true,
});

// Copy static assets
cpSync("src/css", "public/css", { recursive: true });
cpSync("src/public", "public/public", { recursive: true });
cpSync("src/index.html", "public/index.html");
cpSync("src/tutorial.html", "public/tutorial.html");
cpSync("src/submit.html", "public/submit.html");

console.log("Build complete → public/");
