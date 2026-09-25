import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLiveSocket } from '@/api/hooks'
import { LiveBadge, SegmentedControl } from '@/design'
import { NAV_ITEMS } from './Sidebar'

type TimeRange = 'today' | 'day' | 'week'

export default function TopBar() {
  const location = useLocation()
  const { status } = useLiveSocket()
  const [range, setRange] = useState<TimeRange>('day')

  const title = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.label ?? 'Cold-Chain Intelligence'

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-4 tablet:px-6">
      <h1 className="min-w-0 truncate text-headline-md text-navy">{title}</h1>
      <div className="flex shrink-0 items-center gap-3">
        {/* DESIGN.md's mobile layout reflows to essentials — the range control loses to the title below tablet width. */}
        <div className="hidden tablet:block">
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
            ]}
          />
        </div>
        <LiveBadge live={status === 'open'} />
      </div>
    </header>
  )
}
