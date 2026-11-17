import {listener} from './server.mjs';const port=Number(process.env.PORT??8080),host=process.env.HOST??'127.0.0.1';
import express from 'express';const app=express();app.use(listener);app.listen(port,host);
