import {handle} from '../../lib/backend.mjs';
export default async function api(req,res){const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:JSON.stringify(req.body)}:{})});const r=await handle(request);for(const [k,v]of r.headers)res.setHeader(k,v);res.status(r.status).send(await r.text());}
