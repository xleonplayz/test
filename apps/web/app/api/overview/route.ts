import {NextResponse} from "next/server"
import {fromApi, type Overview} from "@/lib/api"

export const dynamic = "force-dynamic"

/*
 * Route Handler: der Browser fragt HIER, nicht bei api. Derselbe Origin,
 * kein CORS, und die Adresse von api bleibt auf dem Server.
 */
export async function GET() {
    const reach = await fromApi<Overview>("/overview")
    if (!reach.ok) return NextResponse.json({error: reach.reason}, {status: 502})
    return NextResponse.json(reach.data, {headers: {"cache-control": "no-store"}})
}
