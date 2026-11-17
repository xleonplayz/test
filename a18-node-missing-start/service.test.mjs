import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from './service.mjs';
const req=(method,path,data,headers={})=>new Request('http://localhost'+path,{method,headers:{'content-type':'application/json','x-sample':'1',...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
const create={revision:0,action:{type:'customer.create',name:'HTTP Kunde',city:'Bremen'}};
 test('HTTP workflow rejects cross origin, malformed and conflicting writes',async()=>{
 const handle=createService(); assert.equal((await handle(req('GET','/api/state'))).status,200);
 assert.equal((await handle(req('POST','/api/commands',create,{origin:'https://foreign.invalid'}))).status,403);
 assert.equal((await handle(req('POST','/api/commands',null))).status,400);
 assert.equal((await handle(req('POST','/api/commands',create))).status,200);
 assert.equal((await handle(req('POST','/api/commands',create))).status,409);
 assert.equal((await handle(req('GET','/missing'))).status,404);
 const response=await handle(req('GET','/api/export'));assert.equal((await response.json()).customers.length,13);
});
 test('storage failure rolls back and concurrent revisions serialize',async()=>{
 let writes=0;const handle=createService({save:async()=>{if(++writes===1)throw Error('disk full');}});
 assert.equal((await handle(req('POST','/api/commands',create))).status,500);
 const results=await Promise.all([handle(req('POST','/api/commands',create)),handle(req('POST','/api/commands',create))]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal((await (await handle(req('GET','/api/export'))).json()).customers.length,13);
});

test('reverse proxy preserves same-origin writes while rejecting foreign origins',async()=>{
 const handle=createService();const headers={'host':'fixture.example.test','origin':'https://fixture.example.test','x-forwarded-proto':'https'};
 assert.equal((await handle(req('POST','/api/commands',create,headers))).status,200);
 assert.equal((await handle(req('POST','/api/commands',{...create,revision:1},{...headers,origin:'https://foreign.example.test'}))).status,403);
});
