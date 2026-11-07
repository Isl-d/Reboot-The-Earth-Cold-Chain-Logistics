// Every sentence on the page lives here, so the copy is edited in one place.
// Facts must agree with the pitch deck (docs/deck/index.html), README.md and
// docs/SAAS_PLAN.md. Anything designed but not built says so on the page.

/** The command center, when it is hosted somewhere public. Unset: no link is shown. */
export const APP_URL: string | null = import.meta.env.VITE_APP_URL || null
export const REPO_URL = 'https://github.com/Isl-d/Reboot-The-Earth-Cold-Chain-Logistics'

// Where every pilot, demo and investor request goes.
export const CONTACT_EMAIL = 'robin@generativegains.com'

export const mailto = (subject: string) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`

export const contact = {
  pilot: mailto('Thermal Trace pilot'),
  demo: mailto('Thermal Trace demo'),
  investors: mailto('Thermal Trace investor deck'),
}

export const brand = {
  name: 'Thermal Trace',
  short: 'ThermalTrace',
  company: 'Generative Gains',
}

export const award = 'Winner, UN Reboot the Earth 2026'

export const nav = [
  { href: '#product', label: 'Product' },
  { href: '#how', label: 'How it works' },
  { href: '#software', label: 'Software' },
  { href: '#pilot', label: 'Pilot' },
  { href: '#team', label: 'Team' },
]

export const hero = {
  eyebrow: 'Cold-chain intelligence for Qatar and the GCC',
  title: 'Know what a failing fridge is costing before the gate does.',
  body:
    'Thermal Trace turns a load’s temperature history into two numbers: how much safe life it has left, and how much of its value can still be recovered. Then it tells your control room what to do while there is still time to do it.',
  primaryCta: 'Book a pilot',
  secondaryCta: 'See how it works',
}

export const problem = {
  eyebrow: 'The problem',
  title: 'A third of our food never gets eaten.',
  body:
    'Today’s systems raise an alarm after the damage is done. The load is rejected at the gate, and nobody can say how much value was left in it or where it could still have been sold.',
  stats: [
    { value: '13%', label: 'of food is lost between harvest and retail' },
    { value: '19%', label: 'more is wasted after it reaches retail and homes' },
    { value: '8–10%', label: 'of global emissions come from food loss and waste' },
  ],
  source: 'FAO / UNEP, 2024',
  why: {
    title: 'Why we start in Qatar',
    body:
      'Fresh food arrives by sea and over land, waits in customs holds and border queues, and crosses a summer that passes 45 °C. A fridge that fails at noon can spoil a load in hours.',
    debt: ['Maritime import', 'Customs hold', 'Border queue', '45 °C summer'],
    debtResult: 'Lost shelf life',
    policy:
      'Qatar’s National Food Security Strategy 2030 targets food waste down 50% and food loss down 30%. National systems work at country level. Thermal Trace works where the loss happens: one truck, one cold room, one pallet at a time.',
    targets: [
      { value: '−50%', label: 'food waste' },
      { value: '−30%', label: 'food loss' },
    ],
    targetsSource: 'Qatar NFSS 2030',
  },
}

export const clocks = {
  eyebrow: 'The product',
  title: 'Safe is not the same as sellable.',
  body:
    'Most systems stop at the first question. Thermal Trace answers both, because food that is still safe can still lose all of its value on the wrong shelf.',
  items: [
    {
      name: 'Thermal Reserve',
      kind: 'The physical clock',
      question: 'Can it still be eaten?',
      clock: ['Production', 'Transport', 'Deterioration', 'Shelf-life boundary'],
      goal: 'Protect physical life.',
      tag: 'CALCULATED',
      status: 'Running today',
    },
    {
      name: 'Commercial Reserve',
      kind: 'The commercial clock',
      question: 'Can it still earn its value?',
      clock: ['Arrival', 'Customer exposure', 'Sell-through', 'Replenishment'],
      goal: 'Protect economic life.',
      tag: 'PREDICTED',
      status: 'Designed, staged in the pilot',
    },
  ],
  footnote:
    'Health creates the possibility of selling. Demand creates the possibility of realising value. Food-safety release always stays with your authorised people.',
} as const

// The four-reserve stack: the spine of the product. Listed top to bottom as
// drawn; `level` is the layer number.
export const stack = {
  eyebrow: 'How it works',
  title: 'Four reserves, one stack.',
  body:
    'Each layer is built on the one below it. Safety rules stay deterministic at the bottom; commercial optimisation runs inside them, never around them.',
  hint: 'Select a layer',
  layers: [
    {
      level: 4,
      name: 'Decision Reserve',
      tag: 'OPTIMIZED',
      status: 'Running today',
      short: 'The time left to act before the good options disappear.',
    },
    {
      level: 3,
      name: 'Commercial Reserve',
      tag: 'PREDICTED',
      status: 'Designed, staged in the pilot',
      short: 'The economic runway: value that can still be realised.',
    },
    {
      level: 2,
      name: 'Thermal Reserve',
      tag: 'CALCULATED',
      status: 'Running today',
      short: 'The physical budget left before quality is compromised.',
    },
    {
      level: 1,
      name: 'Thermal Trace',
      tag: 'MEASURED',
      status: 'Running today',
      short: 'A continuous, timestamped memory of temperature and stress.',
    },
  ],
  // Layer 1 detail: what we measure, and how far along each sensor is.
  signals: [
    { name: 'Temperature', state: 'live', body: 'From our sensor node today. Ceiling and floor probes are next, so a warm layer cannot hide in an average.' },
    { name: 'Humidity', state: 'live', body: 'Shows whether an open door is wetting the cartons.' },
    { name: 'Shock and tilt', state: 'simulated', body: 'Bruising from a dropped pallet is damage a thermometer never sees.' },
    { name: 'Ethylene and gases', state: 'designed', body: 'The fruit itself reporting that it has started to ripen.' },
    { name: 'Near-infrared', state: 'designed', body: 'Finds internal bruising before anything shows outside.' },
    { name: 'Edge camera', state: 'designed', body: 'Colour shift, mould, and a count of what is on the shelf.' },
  ],
  signalStates: {
    live: 'Live today',
    simulated: 'Simulated',
    designed: 'Designed',
  },
  signalsNote: 'Every sensor publishes the same message, so adding one changes nothing downstream.',
  // Layer 2 detail.
  thermal: {
    title: 'The label says 7 days. The trace says 4.5.',
    body:
      'The printed date assumes the load was kept cold the whole way. The trace knows it was not. Exposure, deterioration and remaining life are deterministic physics; no AI model touches these numbers.',
    label: { name: 'Label date', value: '7.0 d' },
    reserve: { name: 'Thermal reserve', value: '4.5 d' },
    formulas: [
      { name: 'Thermal exposure', f: 'Eᴛ = Σ max(0, Tᵢ − T_safe) · Δt' },
      { name: 'Deterioration rate (Arrhenius)', f: 'k(T) = k_ref · e^((Eₐ/R)(1/T_ideal − 1/T))' },
      { name: 'Safe life left', f: 'reserve = L · (1 − Σ k(Tᵢ)·Δtᵢ)' },
    ],
  },
  // Layer 3 detail.
  commercial: {
    title: 'In transit until the profit is booked.',
    body: 'The trace follows the value from farm to ledger, not just from dock to dock.',
    formula: 'CR = Qᵣ × Pᵣ × Vᵣ',
    terms: [
      { sym: 'Qᵣ', label: 'quantity realistically sellable' },
      { sym: 'Pᵣ', label: 'probability it sells in time' },
      { sym: 'Vᵣ', label: 'expected value per unit' },
    ],
    stages: [
      { name: 'Kinetic transit', body: 'On the truck, burning fuel and thermal life.' },
      { name: 'Static transit', body: 'On the shelf, burning shelf life while it waits for customers.' },
      { name: 'Consumer transit', body: 'Into the cart: the moment value is realised.' },
      { name: 'Consolidation', body: 'Sales data flows back, profit hits the ledger, demand triggers replenishment.' },
    ],
  },
  // Layer 4 detail: the deck's worked example.
  decision: {
    title: 'The window to act, and the move to make.',
    body:
      'A reefer’s compressor is failing with 45 minutes of thermal reserve left. The planned hypermarket is 90 minutes away. A buyer 20 minutes away fits.',
    reserveMin: 45,
    options: [
      { name: 'Hypermarket, planned route', etaMin: 90, fits: false },
      { name: 'Nearby buyer, re-routed', etaMin: 20, fits: true },
    ],
    result: 'REROUTE',
    window: 'About 25 minutes to commit.',
    objective: 'min(C_transport + C_food-loss + C_delay)',
    constraints: ['ETA within the remaining thermal reserve', 'Quantity within available capacity', 'Storage temperature compatible'],
  },
} as const

export const journey = {
  eyebrow: 'The journey',
  footage: 'Footage is AI-generated. The readings are a worked example of one incident.',
  cta: 'See the decision',
  chapters: [
    {
      id: 'port',
      video: 'port',
      label: 'Arrival',
      side: 'left',
      from: 'left',
      title: 'Fresh food lands at the quay.',
      body: 'Qatar imports most of its fresh food. It arrives cold, in reefer containers, and from here on every hand-off is a chance for the cold to break.',
    },
    {
      id: 'lift',
      video: 'lift',
      label: 'Trace',
      side: 'right',
      from: 'right',
      title: 'Every load starts to report.',
      body: 'Temperature, humidity, door state and position stream live from the moment it moves. Nothing is inferred from paperwork.',
    },
    {
      id: 'handover',
      video: 'handover',
      label: 'Handover',
      side: 'left',
      from: 'below',
      title: 'Hand-offs are where the cold breaks.',
      body: 'Doors open, reefers unplug, loads wait in the sun. Every degree above the limit is counted against the load’s thermal reserve, so a short door opening costs exactly what it cost.',
    },
    {
      id: 'road',
      video: 'hero',
      label: 'Failure',
      side: 'right',
      from: 'above',
      title: '45 °C outside. The fridge fails.',
      body: 'T102 loses refrigeration in transit. The cargo climbs past its 4 °C limit, and an incident opens the moment the reading leaves the safe band and stays there.',
    },
    {
      id: 'store',
      video: 'store',
      label: 'Decision',
      side: 'left',
      from: 'zoom',
      title: 'Divert to the store that loses the least.',
      body: 'The optimizer compares every cold store in range on transport, food loss and delay, and sends T102 to the one that saves the most food.',
    },
  ],
} as const

export const intelligence = {
  eyebrow: 'AI on a leash',
  title: 'Physics decides. AI explains.',
  body:
    'Every number your team acts on comes from deterministic code. The AI layers sit beside the maths: one checks the decision, one puts it into plain words, and neither is allowed to invent a temperature, an ETA or a cost.',
  pipeline: ['Data', 'Condition', 'Prediction', 'Optimization', 'Decision', 'Food loss'],
  pipelineNote: 'Every reading runs through the same six steps.',
  systems: [
    {
      name: 'Laya',
      role: 'System 1, local and offline',
      tag: 'PREDICTED',
      body: 'Answers typed questions in a single pass: condition, action, urgency, needs human review. It cannot write text, so it cannot invent a number. It corroborates the decision and never overrides it.',
    },
    {
      name: 'The explainer',
      role: 'System 2, cloud language model',
      tag: 'AI-EXPLAINED',
      body: 'Turns code-computed facts into plain language for the operator. It may only rank options that are already feasible. Switch it off and the system still runs; only the prose is plainer.',
    },
  ],
} as const

export const scenario = {
  eyebrow: 'In action',
  title: 'One truck. One failure. One decision.',
  body:
    'T102 loses its refrigeration in transit. The system detects it, measures the damage, predicts the risk, compares cold stores, diverts, and proves how much food it saved.',
  savedNote: 'Computed by the food-loss engine for every incident, never estimated by hand.',
}

export const software = {
  eyebrow: 'The software',
  title: 'One screen for the whole cold chain.',
  body: 'This is what your control room sees. The numbers on it come from deterministic code; the AI only explains them.',
  caption: 'Command center running on our simulator: five trucks in Doha, not a customer fleet.',
  callouts: [
    { n: 1, x: 93, y: 8.7, name: 'Headline figures', body: 'Active trucks, trucks at risk, food saved, loss prevented.' },
    { n: 2, x: 55, y: 30, name: 'Live map', body: 'Every truck, warehouse and store, coloured by risk.' },
    { n: 3, x: 91, y: 43.9, name: 'Active incidents', body: 'Ranked by severity, with the cause in plain words.' },
    { n: 4, x: 91, y: 75.8, name: 'Sensor monitoring', body: 'Each truck’s cargo temperature against its safe range.' },
    { n: 5, x: 86.7, y: 94, name: 'Simulation control', body: 'Trigger a failure in a demo and watch the system respond.' },
  ],
  cta: 'Request a demo',
}

export const customers = {
  eyebrow: 'Who it’s for',
  title: 'Two clocks, one platform.',
  body:
    'Thermal Reserve is the entry point. Commercial Reserve follows once the physical layer is trusted in your operation.',
  divisions: [
    {
      name: 'Thermal Reserve',
      clock: 'Physical clock',
      tag: 'CALCULATED',
      who: ['3PLs', 'Fleets', 'Warehouses'],
      body: 'Sensors and edge gateways record the trace and give a live countdown for every load. Fitted to your equipment, calibrated to your products and routes.',
      status: 'Entry point',
    },
    {
      name: 'Commercial Reserve',
      clock: 'Commercial clock',
      tag: 'PREDICTED',
      who: ['Hypermarkets', 'Hotels, restaurants, caterers'],
      body: 'Joins the physical state with your sales, ERP and warehouse data to send stock where it sells and price it to clear before it spoils.',
      status: 'Designed, staged in the pilot',
    },
  ],
  shift: {
    title: 'From managing biology to managing liquidity.',
    head: ['', 'Legacy cold chain', 'Thermal Trace'],
    rows: [
      ['The goal', 'Delay spoilage', 'Maximise the value recovered'],
      ['Stock is', 'A degrading object', 'An asset with a live value'],
      ['Inventory rule', 'First expired, first out, by printed date', 'Lowest reserve first out, by real thermal history (planned)'],
      ['Intervention', 'A temperature alarm', 'Optimised rerouting today; early markdowns planned'],
      ['Waste', 'An invisible operating tax', 'A measured, bounded value at risk'],
    ],
  },
} as const

export const trust = {
  eyebrow: 'Trust and security',
  title: 'Every value knows where it came from.',
  body:
    'Test data is never dressed up as a real measurement, and literature values are marked unverified until they are calibrated on your products. Every figure in the product carries one of these tags.',
  tags: [
    { tag: 'MEASURED', body: 'Read from a sensor.' },
    { tag: 'CALCULATED', body: 'Deterministic physics: exposure, deterioration, shelf life.' },
    { tag: 'PREDICTED', body: 'A model estimate, with its probability.' },
    { tag: 'OPTIMIZED', body: 'Chosen by the optimizer under hard constraints.' },
    { tag: 'AI-EXPLAINED', body: 'Plain words about code-computed facts. No new numbers.' },
    { tag: 'SYNTHETIC', body: 'Test and training data, labelled as such.' },
  ],
  commitments: [
    { name: 'A person approves every diversion', body: 'Thermal Trace is decision support. It does not replace your HACCP controls or your QA team’s release decision.' },
    { name: 'Your data stays in region', body: 'We host your workspace in Qatar, isolated from every other customer’s.' },
    { name: 'External AI is opt-in', body: 'The cloud explainer is off unless you agree to it in writing. The local model keeps everything on our servers.' },
    { name: 'Records an inspector can read', body: 'Every reading is stored with its source, and rejected readings are kept with the reason they were rejected.' },
  ],
} as const

export const pilot = {
  eyebrow: 'Pilot',
  title: 'Start with a pilot. Pay for what it proves.',
  body:
    'We connect to the reefer telematics you already have where we can, and fit our own sensor node where you have none. The pilot sets the baseline the price is measured against.',
  steps: [
    { name: 'Discovery', time: '1–2 weeks', body: 'Map your fleet, cold rooms, products and who acts on alerts. Agree what success looks like.' },
    { name: 'Pilot', time: '8–12 weeks', body: '5–15 trucks, one distribution centre, one product family. Two weeks in shadow mode, calibrated against your QA data, then live.' },
    { name: 'Contract', time: 'After the pilot', body: 'The measured results become the business case and set the price.' },
    { name: 'Rollout', time: 'In waves', body: 'The rest of the fleet, alert routing per region, and training for operators and site managers.' },
  ],
  promise: { big: 'Pay 1×. Recover 3×.', body: 'Every riyal you pay us should save at least three riyals of food that would otherwise be lost. The pilot measures it.' },
  tiers: [
    {
      name: 'Implementation',
      when: 'Once',
      items: ['Installation and integration', 'Data mapping', 'Calibration to your products', 'Commissioning', 'Hardware at cost, only if you need it'],
    },
    {
      name: 'Standard',
      when: 'Yearly',
      items: ['One product: Thermal or Commercial Reserve', 'Live monitoring, alerts and reserves', 'Monthly value report', 'Email support'],
    },
    {
      name: 'Enterprise',
      when: 'Yearly',
      items: ['Both products', 'Dashboard fitted to your operation', 'Unlimited integrations', 'Single sign-on and uptime SLA', 'Full support'],
    },
  ],
  priceNote: 'Pricing is set per customer from the pilot’s measured results.',
  cta: 'Book a pilot',
}

export const vision = {
  eyebrow: 'Vision',
  title: 'One primitive, many industries.',
  body:
    'Anything that deteriorates, cures or loses viability under the stress of time needs the same architecture. We start where the loss is largest and the data is easiest: the food cold chain in Qatar.',
  chain: ['Trace', 'State', 'Reserve', 'Decision'],
  fields: [
    { name: 'Biopharma', body: 'Stability budgets; intercept a shipment before it fails.' },
    { name: 'Energy', body: 'Inverter telemetry; a grid flexibility reserve.' },
    { name: 'Space cargo', body: 'Propellant bleed and thermal cycling; a mission reserve.' },
    { name: 'Defence logistics', body: 'Munition shock and degradation; a readiness reserve.' },
  ],
  note: 'Directions, not products we have built.',
}

export const team = {
  eyebrow: 'Team',
  title: 'Built in Qatar by Generative Gains.',
  body:
    'Thermal Trace started as our entry to the UN Reboot the Earth hackathon. It won, and we turned it into a company.',
  people: [
    { name: 'Najeeb Abdi', role: 'Math and frontend' },
    { name: 'Islambek', role: 'Hardware engineer' },
    { name: 'Param Anand Trimbake', role: 'Frontend' },
    { name: 'Ahad Hussain', role: 'AI engineer' },
    { name: 'Robin Thomas', role: 'Business and product' },
  ],
  investors: {
    title: 'We’re raising our pre-seed round.',
    body: 'QAR 1.85M over twelve months to put an anchor customer live at 3–5 facilities and measure the avoided loss. Qatar first, the GCC next.',
    cta: 'Request the investor deck',
  },
}

export const cta = {
  title: 'Find out what your failing fridges cost.',
  body: 'Tell us about your fleet and your cold rooms. We’ll show you the command center on a call and scope a pilot around your products.',
  primary: 'Book a pilot',
  secondary: 'Request a demo',
}

export const footer = {
  disclaimer:
    'Example figures are illustrative. Background footage is AI-generated. Literature values are cited, not certified thresholds. Designed features are marked as designed.',
  source: 'Open source on GitHub',
}
