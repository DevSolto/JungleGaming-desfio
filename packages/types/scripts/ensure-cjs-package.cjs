const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const outputDir = join(__dirname, '..', 'dist-cjs');
const packageJsonPath = join(outputDir, 'package.json');

mkdirSync(outputDir, { recursive: true });

const packageJson = {
  type: 'commonjs',
};

writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
