import {listener} from './server.mjs';const port=Number(process.env.PORT??8080),host=process.env.HOST??'127.0.0.1';
import Fastify from 'fastify';const app=Fastify();app.removeAllContentTypeParsers();app.addContentTypeParser('*',(_req,payload,done)=>done(null,payload));app.all('/*',async(req,reply)=>{reply.hijack();await listener(req.raw,reply.raw);});await app.listen({port,host});
