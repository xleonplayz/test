import { Warehouse, seed, DomainError } from './domain.mjs';
export function createService({ size = 48, state, save = async()=>{}, before = async()=>{}, name = 'Kontor', version = 'v1', peer = '' } = {}) {
  const warehouse = new Warehouse(state ?? seed(size));
  let queue = Promise.resolve();
  const serial = fn => { const task = queue.then(fn); queue = task.catch(()=>{}); return task; };
  return async function handle(request) {
    const url = new URL(request.url), path = url.pathname;
    const json = (value, status = 200, headers = {}) => Response.json(value,{status,headers:{'cache-control':'no-store',...headers}});
    try {
      await before(request);
      if (request.method === 'GET') {
        if (path === '/health' || path === '/api/health') return json({ok:true,name,version});
        if (path === '/api/state') return json(warehouse.snapshot({query:url.searchParams.get('q')??'',category:url.searchParams.get('category')??'',page:Number(url.searchParams.get('page')??1)}));
        if (path === '/api/export') return json(warehouse.export(),200,{'content-disposition':'attachment; filename="kontor.json"'});
        if (path === '/api/report.csv') return new Response(warehouse.csv(),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="kontor.csv"'}});
        if (path === '/api/config') return json({name,version});
        if (path === '/api/peer') {
          if(!peer)return json({error:'PEER_URL fehlt'},503);
          try { const r=await fetch(new URL('/api/state',peer),{signal:AbortSignal.timeout(3000)});return new Response(await r.text(),{status:r.status,headers:{'content-type':'application/json'}}); }
          catch {return json({error:'peer_unavailable'},502);}
        }
      }
      if (request.method === 'POST' && path === '/api/commands') {
        if(request.headers.get('x-sample')!=='1')return json({error:'X-Sample erforderlich'},403);
        const origin=request.headers.get('origin');if(origin && origin!==new URL((request.headers.get('x-forwarded-proto')==='https'?'https:':url.protocol)+'//'+(request.headers.get('host')??url.host)).origin)return json({error:'Fremde Herkunft'},403);
        if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON erforderlich'},415);
        const body=await request.text();if(body.length>128000)return json({error:'Anfrage zu groß'},413);
        let data;try{data=JSON.parse(body);}catch{return json({error:'Ungültiges JSON'},400);}
        if(!data||typeof data!=='object')return json({error:'Objekt erforderlich'},400);
        return await serial(async()=>{
          const previous=warehouse.export();
          try{const result=warehouse.command(data.revision,data.action);await save(warehouse.export());return json(result);}
          catch(error){warehouse.state=previous;throw error;}
        });
      }
      return json({error:'Nicht gefunden'},404);
    } catch(error) { return json({error:error instanceof DomainError?error.message:'Dienst nicht verfügbar'},error instanceof DomainError?error.status:500); }
  };
}
