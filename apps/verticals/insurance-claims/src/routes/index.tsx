import { createFileRoute, Link } from '@tanstack/react-router'
import { INSURANCE_WORKFLOWS } from '@/domain/insurance-workflows'
export const Route=createFileRoute('/')({component:Home})
function Home(){return <main className="container section"><div className="eyebrow">Insurance Claims</div><h1>Build the claim record. Challenge the denial. Mail the response.</h1><p className="muted">Problem-specific insurance workflows for claims, denials, coverage disputes, health and disability appeals, property losses, and complex claims.</p><Link className="btn" to="/workflows">Explore all {INSURANCE_WORKFLOWS.length} workflows →</Link></main>}
