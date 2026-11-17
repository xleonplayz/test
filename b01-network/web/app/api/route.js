import {remote} from '../../lib/remote.mjs';export async function GET(request){return remote(new Request(new URL('/api/state',request.url)));}
