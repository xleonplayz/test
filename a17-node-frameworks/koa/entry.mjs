import {listener} from './server.mjs';const port=Number(process.env.PORT??8080),host=process.env.HOST??'127.0.0.1';
import Koa from 'koa';const app=new Koa();app.use(async ctx=>{ctx.respond=false;await listener(ctx.req,ctx.res);});app.listen(port,host);
