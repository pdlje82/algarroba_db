import type {LayoutRequest,LayoutResult} from './layout';
export function requestLayout(request:LayoutRequest,signal:AbortSignal,timeoutMs=20000):Promise<LayoutResult>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./layout.worker.ts',import.meta.url),{type:'module'});
  let timer:ReturnType<typeof setTimeout>;const dispose=()=>{clearTimeout(timer);worker.terminate();signal.removeEventListener('abort',abort)};
  const abort=()=>{dispose();reject(new DOMException('Superseded layout','AbortError'))};
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return}
  worker.onmessage=event=>{dispose();if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.result)};
  worker.onerror=()=>{dispose();reject(new Error('The layout could not be prepared. Your previous view is preserved.'))};
  timer=setTimeout(()=>{dispose();reject(new Error('The complete layout took too long. Your previous view is preserved; retry or close other detail.'))},timeoutMs);
  worker.postMessage(request);
 });
}
