import {calculateLayout,type LayoutRequest} from './layout';
self.onmessage=(event:MessageEvent<LayoutRequest>)=>{try{self.postMessage({result:calculateLayout(event.data)})}catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)})}};
