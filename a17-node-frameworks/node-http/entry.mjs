import {listener} from './server.mjs';const port=Number(process.env.PORT??8080),host=process.env.HOST??'127.0.0.1';
import {createServer} from 'node:http';createServer(listener).listen(port,host);
