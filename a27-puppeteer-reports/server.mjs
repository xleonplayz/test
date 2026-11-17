import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createService } from './service.mjs';
import puppeteer from 'puppeteer-core';
const handle=createService({size:Number(process.env.CATALOG_SIZE??48),name:process.env.APP_NAME??'Kontor',version:process.env.RELEASE??'v1',peer:process.env.PEER_URL??''});
const files={'/':['index.html','text/html'],'/ui.js':['ui.js','text/javascript'],'/boot.js':['boot.js','text/javascript'],'/style.css':['style.css','text/css']};
export async function listener(req,res){
  try{
    const url=new URL(req.url,'http://'+req.headers.host);
    if(url.pathname==='/api/report.pdf'){
      if(!process.env.CHROME_PATH){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'BROWSER_UNAVAILABLE',hint:'Set CHROME_PATH to an installed Chromium executable'}));return;}
      let browser;try{browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox'],timeout:10000});const page=await browser.newPage();await page.setContent('<h1>Kontor · Bestandsbericht</h1><pre>'+JSON.stringify(await (await handle(new Request('http://localhost/api/state'))).json(),null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')+'</pre>');const pdf=await page.pdf({format:'A4'});res.writeHead(200,{'content-type':'application/pdf'});res.end(Buffer.from(pdf));}finally{await browser?.close();}return;
    }
    if(req.method==='GET' && files[url.pathname]){const [file,type]=files[url.pathname];res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});res.end(await readFile(new URL(file,import.meta.url)));return;}
    const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>128000){res.writeHead(413);res.end();return;}chunks.push(c);}
    const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const response=await handle(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500,{'content-type':'application/json'});res.end('{"error":"request_failed"}');}
}
if(process.argv[1] && new URL(import.meta.url).pathname===process.argv[1]){
  const server=createServer(listener);server.listen(Number(process.env.PORT??8080),process.env.HOST??'127.0.0.1',()=>console.log('Kontor ready'));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
}
