// Offline boundary tests: no CAD contents, network, credentials or engine dependency.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/fem/preflight.ts', import.meta.url),'utf8');
const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exports = {};
vm.runInNewContext(code,{exports});
const {inspectSelection,validSettings,DEFAULT_SETTINGS,MAX_CAD_BYTES}=exports;
let checks=0;
function check(name,fn) { fn(); checks++; console.log(`PASS ${name}`); }
check('case-insensitive STEP/STP/BREP selection',()=>{
  for(const name of ['sample.STEP','sample.StP','sample.BREP']) assert.ok(inspectSelection([{name,size:12}]).file);
});
check('reject missing or multiple files',()=>{
  assert.equal(inspectSelection([]).error,'fileCount');
  assert.equal(inspectSelection([{name:'a.step',size:1},{name:'b.step',size:1}]).error,'fileCount');
});
check('reject unsupported and disguised extensions',()=>{
  for(const name of ['sample.stl','sample.step.exe','sample','sample.step.']) assert.equal(inspectSelection([{name,size:12}]).error,'fileType');
});
check('reject empty CAD file',()=>assert.equal(inspectSelection([{name:'sample.step',size:0}]).error,'fileEmpty'));
check('accept exact size limit, reject above limit',()=>{
  assert.ok(inspectSelection([{name:'sample.step',size:MAX_CAD_BYTES}]).file);
  assert.equal(inspectSelection([{name:'sample.step',size:MAX_CAD_BYTES+1}]).error,'fileLarge');
});
check('return metadata without reading file contents',()=>{
  const result=inspectSelection([{name:'sample.step',size:12,text(){throw Error('Content must not be read');},arrayBuffer(){throw Error('Content must not be read');}}]);
  assert.deepEqual(Object.keys(result.file).sort(),['format','name','size']);
});
check('default settings are valid',()=>assert.equal(validSettings(DEFAULT_SETTINGS),true));
for(const [field,bad] of Object.entries({size:['',' ','0','-1','NaN','Infinity','100001'],jacobian:['','0','-1','1.01','NaN'],aspect:['','0','0.9','1001','Infinity']})) {
  check(`reject invalid ${field} targets`,()=>{for(const value of bad) assert.equal(validSettings({...DEFAULT_SETTINGS,[field]:value}),false);});
}
check('accept valid quality boundaries',()=>assert.equal(validSettings({...DEFAULT_SETTINGS,size:'0.001',jacobian:'1',aspect:'1'}),true));
check('reject unsupported strategy, units and order',()=>{
  for(const [field,value] of [['strategy','unknown'],['unit','inch'],['order','cubic']]) assert.equal(validSettings({...DEFAULT_SETTINGS,[field]:value}),false);
});
console.log(`${checks} FEM preflight checks passed.`);
