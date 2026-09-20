import { C } from '@/components/platform/brand'
import CeoDashboardClient from './ceo-client'

export default function CeoDashboardPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.dark }}>
      <CeoDashboardClient />
    </div>
  )
}
