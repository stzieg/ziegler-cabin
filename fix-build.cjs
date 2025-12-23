#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to exclude from build (test files)
const excludePatterns = [
  /\.test\.(ts|tsx)$/,
  /\.property\.test\.(ts|tsx)$/,
  /\.accessibility\.test\.(ts|tsx)$/,
  /\.errorHandling\.test\.(ts|tsx)$/,
  /\.formstate\.property\.test\.(ts|tsx)$/,
  /\.styling\.test\.(ts|tsx)$/,
];

// Update tsconfig to exclude test files from build
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

if (!tsconfig.exclude) {
  tsconfig.exclude = [];
}

// Add test file patterns to exclude
const testPatterns = [
  "**/*.test.ts",
  "**/*.test.tsx", 
  "**/*.property.test.ts",
  "**/*.property.test.tsx",
  "**/*.accessibility.test.tsx",
  "**/*.errorHandling.test.tsx",
  "**/*.formstate.property.test.tsx",
  "**/*.styling.test.tsx"
];

testPatterns.forEach(pattern => {
  if (!tsconfig.exclude.includes(pattern)) {
    tsconfig.exclude.push(pattern);
  }
});

fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
console.log('Updated tsconfig.json to exclude test files from build');