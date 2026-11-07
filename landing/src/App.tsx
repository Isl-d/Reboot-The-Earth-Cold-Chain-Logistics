import Nav from '@/components/Nav'
import { LiveProvider } from '@/live/LiveProvider'
import CallToAction from '@/sections/CallToAction'
import Clocks from '@/sections/Clocks'
import Customers from '@/sections/Customers'
import Footer from '@/sections/Footer'
import Hero from '@/sections/Hero'
import Intelligence from '@/sections/Intelligence'
import Journey from '@/sections/Journey'
import LiveStats from '@/sections/LiveStats'
import Pilot from '@/sections/Pilot'
import Problem from '@/sections/Problem'
import Provenance from '@/sections/Provenance'
import ReserveStack from '@/sections/ReserveStack'
import Scenario from '@/sections/Scenario'
import Software from '@/sections/Software'
import Team from '@/sections/Team'
import Vision from '@/sections/Vision'

// The pitch deck's story for a buyer: problem, the idea (two clocks), how it
// works (the reserve stack, the film, AI on a leash, a decision), the
// software, who it is for, trust, how to start, and who we are.
export default function App() {
  return (
    <LiveProvider>
      <Nav />
      <main>
        <Hero />
        <LiveStats />
        <Problem />
        <Clocks />
        <ReserveStack />
        <Journey />
        <Intelligence />
        <Scenario />
        <Software />
        <Customers />
        <Provenance />
        <Pilot />
        <Vision />
        <Team />
        <CallToAction />
      </main>
      <Footer />
    </LiveProvider>
  )
}
