import {createService} from '../service.mjs';
globalThis.__kontor ??= createService({size:Number(process.env.CATALOG_SIZE??48),peer:process.env.PEER_URL??'',version:process.env.RELEASE??'v1',name:"B1-project-a"});
export const handle=globalThis.__kontor;
