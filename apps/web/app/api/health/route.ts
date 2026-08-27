import {NextResponse} from "next/server"
import {fromApi, type Health} from "@/lib/api"

export const dynamic = "force-dynamic"

/** Was die Plattform ueber sich und ihre Dienste weiss — als JSON. */
export async function GET() {
    const reach = await fromApi<Health>("/health")
    return NextResponse.json({
        ok: true,
        app: "web",
        api: reach.ok ? "up" : `down: ${reach.reason}`,
        upstreams: reach.ok ? reach.data.upstreams : null,
    })
}
