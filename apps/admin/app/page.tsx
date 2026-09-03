export const dynamic = "force-static"

export default function AdminHome() {
    return (
        <section>
            <h1>Admin</h1>
            <p>
                Der Admin-Zugang zur Lagerplattform: Bestellungen ausliefern und
                stornieren, Bestand und Zahlungen ansehen — über denselben einen
                Draht wie der Laden.
            </p>
            <p style={{color: "#666"}}>
                web · admin → api → inventory · pricing · orders · payments
            </p>
        </section>
    )
}
