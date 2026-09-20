import { C } from '@/components/platform/brand'
import FinancesClient from './finances-client'

export default function FinancesPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.dark }}>
      <FinancesClient />
    </div>
  )
}
