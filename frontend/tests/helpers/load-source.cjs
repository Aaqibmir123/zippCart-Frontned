const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const sourceRequire = Module.createRequire(path.join(root, 'package.json'));

// Keep one module graph per test so session identity is shared by all imports.
exports.sourceLoader = (mocks = {}) => {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const target = new Module(filename);
    cache.set(filename, target);
    target.require = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (!name.startsWith('.')) return sourceRequire(name);
      const base = path.resolve(path.dirname(filename), name);
      const resolved = [base, base + '.ts', base + '.tsx', base + '.cjs']
        .find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
      if (!resolved) throw new Error(`Cannot resolve ${name} from ${filename}`);
      return load(resolved);
    };
    target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, filename);
    return target.exports;
  }
  return load;
};
