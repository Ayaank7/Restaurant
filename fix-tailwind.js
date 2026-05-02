import fs from 'fs';

const pkgPath = './node_modules/tailwindcss/package.json';
const stubPath = './node_modules/tailwindcss/resolveConfig.js';

if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // Add the missing export that lovable-tagger is looking for
  if (!pkg.exports) pkg.exports = {};
  pkg.exports['./resolveConfig.js'] = {
    "import": "./resolveConfig.js",
    "default": "./resolveConfig.js"
  };
  
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  
  // Create a dummy config file to satisfy the plugin
  fs.writeFileSync(stubPath, 'export default function resolveConfig(config) { return config; }\n');
  
  console.log('✅ Patched Tailwind v4 to bypass lovable-tagger crash');
}