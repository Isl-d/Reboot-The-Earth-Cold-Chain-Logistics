import Nav from '@/components/Nav'
import { LiveProvider } from '@/live/LiveProvider'
import Architecture from '@/sections/Architecture'
import CallToAction from '@/sections/CallToAction'
import Footer from '@/sections/Footer'
import Hero from '@/sections/Hero'
import LiveStats from '@/sections/LiveStats'
import Network from '@/sections/Network'
import Pipeline from '@/sections/Pipeline'
import Problem from '@/sections/Problem'
import Provenance from '@/sections/Provenance'
import Scenario from '@/sections/Scenario'

export default function App() {
  return (
    <LiveProvider>
      <Nav />
      <main>
        <Hero />
        <LiveStats />
        <Problem />
        <Pipeline />
        <Scenario />
        <Network />
        <Provenance />
        <Architecture />
        <CallToAction />
      </main>
      <Footer />
    </LiveProvider>
  )
}
