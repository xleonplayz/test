import {createServer} from 'node:http';import {listener} from '../server.mjs';const port:number=Number(process.env.PORT??8080);createServer(listener).listen(port,process.env.HOST??'127.0.0.1');
