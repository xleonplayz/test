import {refreshSession} from '../../../lib/session.mjs';export async function GET(request){return Response.json(await refreshSession(new URL(request.url).searchParams.has('fail')));}
