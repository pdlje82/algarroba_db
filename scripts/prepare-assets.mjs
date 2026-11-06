import {cpSync,mkdirSync} from 'node:fs';
for (const directory of ['standard_fonts','cmaps','wasm']) {
  mkdirSync('public/pdf-assets/'+directory,{recursive:true});
  cpSync('node_modules/pdfjs-dist/'+directory,'public/pdf-assets/'+directory,{recursive:true});
}
