import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  MagnifyingGlass,
  Funnel,
  DownloadSimple,
  Eye,
  ClockCounterClockwise,
} from '@phosphor-icons/react'
import PageShell from '../components/layout/PageShell'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { RiskBadge } from '../components/common/Badge'
import { SkeletonTable } from '../components/common/Skeleton'
import { EmptyState } from '../components/common/EmptyState'
import { Tabs } from '../components/common/Tabs'
import { useDebounce } from '../hooks/useDebounce'
import { getTransactionHistory } from '../services/api'
import { formatINR, timeAgo } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function TransactionHistory() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('ALL')

  // Use debounced search query per cc-skill-frontend-patterns
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true)
        const res = await getTransactionHistory()
        setTransactions(res.transactions || [])
      } catch (err) {
        console.error('Failed to load transaction history', err)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesRisk = riskFilter === 'ALL' || t.riskLevel === riskFilter
      const q = debouncedSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        t.paymentDetails?.recipientId?.toLowerCase().includes(q) ||
        t.paymentDetails?.paymentPurpose?.toLowerCase().includes(q) ||
        t.fraudCategory?.toLowerCase().includes(q) ||
        t.conversationExcerpt?.toLowerCase().includes(q)
      return matchesRisk && matchesSearch
    })
  }, [transactions, debouncedSearch, riskFilter])

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No transactions available to export')
      return
    }

    const headers = ['ID', 'Date', 'Beneficiary', 'Amount', 'Risk Level', 'Risk Score', 'Category']
    const rows = filtered.map((t) => [
      t.id,
      t.timestamp,
      t.paymentDetails?.recipientId || 'N/A',
      t.paymentDetails?.amount || '',
      t.riskLevel,
      t.riskScore,
      t.fraudCategory || 'Legitimate',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `upi_rakshak_audit_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Audit log exported as CSV')
  }

  return (
    <PageShell
      title="Transaction Audit History"
      subtitle="Complete chronological log of pre-transaction evaluations, behavioral scores, and risk triggers."
      action={
        <Button variant="secondary" size="sm" icon={DownloadSimple} onClick={handleExportCSV}>
          Export CSV Log
        </Button>
      }
    >
      <Card>
        <Card.Header className="flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search VPA, purpose or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={MagnifyingGlass}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-content-tertiary)] flex items-center gap-1">
              <Funnel size={14} /> Tier:
            </span>
            <Tabs defaultTab="ALL" value={riskFilter} onChange={setRiskFilter}>
              <Tabs.List>
                {['ALL', 'Low', 'Medium', 'High', 'Critical'].map((level) => (
                  <Tabs.Tab key={level} id={level}>
                    {level}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </div>
        </Card.Header>

        <Card.Content>
          {loading ? (
            <SkeletonTable rows={6} cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No matching evaluation records"
              description={
                search || riskFilter !== 'ALL'
                  ? 'No records match your active search and filter criteria.'
                  : 'You have not performed any evaluations yet.'
              }
              actionLabel={search || riskFilter !== 'ALL' ? 'Reset Filters' : 'Run New Assessment'}
              onAction={() => {
                if (search || riskFilter !== 'ALL') {
                  setSearch('')
                  setRiskFilter('ALL')
                } else {
                  window.location.href = '/assess'
                }
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-[var(--color-content-tertiary)]">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Beneficiary VPA / Context</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Diagnosed Typology</th>
                    <th className="pb-3">Risk Assessment</th>
                    <th className="pb-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3.5 text-[var(--color-content-tertiary)] font-data whitespace-nowrap">
                        {timeAgo(t.timestamp)}
                      </td>
                      <td className="py-3.5 pr-3 font-semibold font-data text-[var(--color-content-primary)] max-w-[220px] truncate">
                        {t.paymentDetails?.recipientId || t.conversationExcerpt || 'Manual Assessment'}
                      </td>
                      <td className="py-3.5 font-data font-bold text-[var(--color-content-primary)]">
                        {t.paymentDetails?.amount ? formatINR(t.paymentDetails.amount) : '--'}
                      </td>
                      <td className="py-3.5 text-[var(--color-content-secondary)]">
                        {t.fraudCategory ? t.fraudCategory.replace(/_/g, ' ') : 'Legitimate'}
                      </td>
                      <td className="py-3.5">
                        <RiskBadge level={t.riskLevel} score={t.riskScore} />
                      </td>
                      <td className="py-3.5 text-right">
                        <Link to={`/results/${t.id}`}>
                          <Button variant="ghost" size="sm" icon={Eye}>
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>
    </PageShell>
  )
}
