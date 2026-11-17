import { randomUUID, createHmac } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './server.mjs';
import config from './case.json' with {type:'json'};
const integer=(name,fallback,max)=>{const v=Number(process.env[name]??fallback);if(!Number.isInteger(v)||v<0||v>max)throw Error('Invalid '+name);return v;};
if(process.env.FAIL_START==='1')throw Error('FIXTURE_START_FAILURE '+config.id);
const boot=Date.now(),instance=randomUUID(),release=process.env.RELEASE??'v1';
const readyAfter=integer('READY_DELAY_MS',0,60000),delay=integer('RESPONSE_DELAY_MS',0,30000);
const dir=process.env.APP_DATA_DIR??resolve('data');
const {server,store}=createApp(dir);
const original=server.listeners('request')[0];server.removeAllListeners('request');
const metrics={requests:0,bytes:0,statuses:{}};
const json=(res,code,value)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(value));};
server.on('request',async(req,res)=>{
  let bytes=0;const write=res.write.bind(res),end=res.end.bind(res);
  res.write=(chunk,...args)=>{if(chunk)bytes+=Buffer.byteLength(chunk);return write(chunk,...args);};
  res.end=(chunk,...args)=>{if(chunk)bytes+=Buffer.byteLength(chunk);return end(chunk,...args);};
  res.on('finish',()=>{metrics.requests++;metrics.bytes+=bytes;metrics.statuses[res.statusCode]=(metrics.statuses[res.statusCode]??0)+1;});
  res.setHeader('x-fixture-id',config.id);res.setHeader('x-release',release);res.setHeader('x-instance',instance);
  try{
    const url=new URL(req.url,'http://'+req.headers.host),path=url.pathname;
    if(Date.now()-boot<readyAfter){json(res,503,{error:'starting',release});return;}
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    if(path==='/__fixture')return json(res,200,{id:config.id,release,instance,uptimeMs:Date.now()-boot,project:process.env.PROJECT_MARKER??config.id,mode:config.persistence,capabilities:config.capabilities});
    if(path==='/__fixture/metrics')return json(res,200,metrics);
    if(path==='/__fixture/config')return json(res,200,{publicValue:process.env.PUBLIC_VALUE??'default',apiUrl:process.env.API_URL??'',nodeEnv:process.env.NODE_ENV??'',port:Number(process.env.PORT??config.port),secretConfigured:Boolean(process.env.FIXTURE_SECRET),release});
    if(path==='/__fixture/proof'){
      const nonce=url.searchParams.get('nonce')??'';if(nonce.length<8||nonce.length>128)return json(res,400,{error:'nonce requires 8–128 characters'});
      if(!process.env.FIXTURE_SECRET)return json(res,503,{error:'secret_unset'});
      return json(res,200,{proof:createHmac('sha256',process.env.FIXTURE_SECRET).update(nonce).digest('hex')});
    }
    if(path==='/__fixture/status'){
      const status=Number(url.searchParams.get('code'));if(![200,401,403,404,429,500,502,503,504].includes(status))return json(res,400,{error:'invalid_status'});
      return json(res,status,{error:'application_owned_response',case:config.id,release,status});
    }
    if(path==='/__fixture/bytes'){
      const n=Number(url.searchParams.get('n')??1024);if(!Number.isInteger(n)||n<0||n>8*1024*1024)return json(res,400,{error:'invalid_size'});
      res.writeHead(200,{'content-type':'application/octet-stream','content-length':n});res.end(Buffer.alloc(n,0x61));return;
    }
    if(path==='/__fixture/peer'||path==='/api/peer'||path==='/__fixture/egress'){
      const target=path.endsWith('egress')?process.env.EGRESS_URL:process.env.PEER_URL??process.env.API_URL;
      if(!target)return json(res,503,{error:'target_not_configured'});
      const destination=new URL(path.endsWith('egress')?target:new URL('/health',target));
      if(!['http:','https:'].includes(destination.protocol))return json(res,400,{error:'invalid_protocol'});
      try{const response=await fetch(destination,{signal:AbortSignal.timeout(integer('FETCH_TIMEOUT_MS',2000,10000))});const body=await response.text();return json(res,response.ok?200:502,{upstreamStatus:response.status,body:body.slice(0,64000),project:process.env.PROJECT_MARKER??config.id});}
      catch{return json(res,502,{error:'egress_or_peer_denied',case:config.id});}
    }
    if(path==='/__fixture/append'&&req.method==='POST'){
      if(req.headers['x-fixture']!=='1')return json(res,403,{error:'fixture_header_required'});
      mkdirSync(dir,{recursive:true});appendFileSync(resolve(dir,'events.jsonl'),JSON.stringify({at:new Date().toISOString(),release,instance})+'\n');return json(res,201,{written:true});
    }
    if(path==='/__fixture/log-probe'&&req.method==='POST'){
      if(req.headers['x-fixture']!=='1')return json(res,403,{error:'fixture_header_required'});
      // This fixed, public marker is deliberately emitted to exercise platform masking.
      console.log('mask-probe fixture-public-secret-marker-20261117');return json(res,200,{emitted:true});
    }
    if(path==='/__fixture/redirect'){
      const next=url.searchParams.get('next')??'/';
      const target=new URL(next,url);const allowed=target.origin===url.origin&&!next.startsWith('//');
      res.writeHead(303,{location:allowed?target.pathname+target.search:'/'});res.end();return;
    }
    return original(req,res);
  }catch{if(!res.headersSent)json(res,500,{error:'fixture_request_failed'});else res.destroy();}
});
server.listen(integer('PORT',config.port,65535),process.env.HOST??'127.0.0.1',()=>console.log(JSON.stringify({event:'ready',case:config.id,release,port:server.address().port})));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{
  server.close(()=>{store.close();process.exit(0);});
  server.closeIdleConnections();setTimeout(()=>process.exit(1),10000).unref();
});
