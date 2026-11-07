import ts from 'typescript';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
// Local-only renderer regressions use the installed Three version and actual production modules.
await mkdir('data/browser-qa',{recursive:true});
for(const name of ['connectionGeometry','bokeh','depth','backgroundEffects','cardGeometry','polygonRouting']){
 const source=await readFile('frontend/'+name+'.ts','utf8');
 const result=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 await writeFile('data/browser-qa/'+name+'.js',result.outputText.replace(/(['"])\.\/([\w]+)\.ts\1/g,'$1./$2.js$1'));
}
