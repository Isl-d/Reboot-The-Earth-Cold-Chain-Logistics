/*
  Real app shell (replaces Segment 0's throwaway version). Kept thin per
  plan.md — Person 1 owns the eventual command-center landing page, so this
  shell exists only so Person 2's 6 screens have somewhere to render during
  standalone development, and drops in cleanly when merged.
*/
import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import PageGrid from './PageGrid'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

function ScreenFallback() {
  return <div className="col-span-4 tablet:col-span-8 desktop:col-span-12 py-16 text-center text-body-sm text-muted">Loading…</div>
}

export default function Shell() {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-3 tablet:p-4 desktop:p-6">
          <PageGrid>
            <Suspense fallback={<ScreenFallback />}>
              <Outlet />
            </Suspense>
          </PageGrid>
        </main>
      </div>
    </div>
  )
}
