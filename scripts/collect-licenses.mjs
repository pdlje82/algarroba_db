import {readFileSync,writeFileSync,existsSync,readdirSync,mkdirSync,copyFileSync} from 'node:fs';
import {basename,join} from 'node:path';
mkdirSync('third_party/npm',{recursive:true});
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const result=[];
for(const [path,info] of Object.entries(lock.packages)){
 if(!path||!existsSync(join(path,'package.json')))continue;
 const p=JSON.parse(readFileSync(join(path,'package.json'),'utf8'));
 const entry={name:p.name,version:p.version,license:p.license||info.license||'See included licence'};result.push(entry);
 const folder=join('third_party/npm',p.name.replaceAll('/','__')+'-'+p.version);mkdirSync(folder,{recursive:true});
 for(const file of readdirSync(path))if(/^(licen[cs]e|copying|notice)(\.|$)/i.test(file))try{copyFileSync(join(path,file),join(folder,basename(file)))}catch{}
}
result.sort((a,b)=>a.name.localeCompare(b.name));
writeFileSync('third_party/npm-licenses.json',JSON.stringify(result,null,2)+'\n');
console.log(result.length+' installed npm package licence records collected.');
