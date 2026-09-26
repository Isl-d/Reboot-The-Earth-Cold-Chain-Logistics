// Every sentence on the page lives here. Source: pitch/DECK.md and README.md;
// edit the pitch first, then mirror it here, so the deck and the site agree.

export const APP_URL: string = import.meta.env.VITE_APP_URL ?? 'http://localhost:5173'
export const REPO_URL = 'https://github.com/Isl-d/Reboot-The-Earth-Cold-Chain-Logistics'

export const brand = {
  name: 'Thermal Trace',
  short: 'ThermalTrace',
}

export const nav = [
  { href: '#journey', label: 'Journey' },
  { href: '#how', label: 'How it works' },
  { href: '#demo', label: 'Demo' },
  { href: '#trust', label: 'Trust' },
  { href: '#architecture', label: 'Architecture' },
]

export const hero = {
  eyebrow: 'AI cold-chain management · food-loss prevention',
  title: 'Know what a failing fridge is costing before the gate does.',
  body:
    'A condition-aware cold-chain decision system: it watches food in transit, measures how much safe life a failure has cost, and chooses the action that loses the least of it.',
  primaryCta: 'See the demo',
  secondaryCta: 'Open the command center',
}

export const problem = {
  eyebrow: 'The problem',
  title: 'Nobody finds out until the load is rejected at the gate.',
  body:
    'By then the food is gone, and so is any chance to send it somewhere it could still be sold. Qatar imports most of its fresh food across a summer that passes 45 °C. A truck fridge that fails at noon can spoil a load in hours.',
  stats: [
    { value: '13%', label: 'of food is lost between harvest and retail' },
    { value: '19%', label: 'more is wasted after it reaches retail and homes' },
    { value: '8–10%', label: 'of global emissions come from food loss and waste' },
  ],
  source: 'FAO / UNEP, 2024',
  target:
    "Qatar's National Food Security Strategy 2030 targets −50% food waste and −30% food loss.",
}

// The pinned, scroll-driven film. `video` names a clip in src/assets/media/;
// `side` is where the words sit (the documents take the other side); `from` is
// the edge the words fly in from.
export const journey = {
  eyebrow: 'The journey',
  footage: 'Footage is AI-generated and illustrative. Readings are the scripted T102 demo.',
  cta: 'Walk through the full demo',
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
      label: 'Telemetry',
      side: 'right',
      from: 'right',
      title: 'Every load starts to report.',
      body: 'Temperature, humidity, door state and position stream over MQTT from the moment it moves. Nothing is inferred from paperwork.',
    },
    {
      id: 'handover',
      video: 'handover',
      label: 'Handover',
      side: 'left',
      from: 'below',
      title: 'Hand-offs are where the cold breaks.',
      body: 'Doors open, reefers unplug, loads wait in the sun. Exposure integrates every degree above the limit over time, so a short door opening counts for exactly what it cost.',
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

export const pipeline = {
  eyebrow: 'How it works',
  title: 'Physics first. AI where it earns its place.',
  steps: [
    {
      name: 'Sensors',
      verb: 'say what is happening',
      body: 'Every truck reports temperature, humidity, door state and position, live.',
    },
    {
      name: 'Mathematics',
      verb: 'says how much damage has occurred',
      body: 'Thermal exposure is the integral of degrees above the limit over time; deterioration is an Arrhenius rate.',
    },
    {
      name: 'Prediction',
      verb: 'says what may happen next',
      body: 'Spoilage probability and anomaly detection, from models that never touch the physics.',
    },
    {
      name: 'Optimization',
      verb: 'chooses the action',
      body: 'min(transport + food loss + delay), subject to ETA, capacity and temperature compatibility.',
    },
    {
      name: 'Decision',
      verb: 'turns it into an operation',
      body: 'Continue, divert or reroute: one clear recommendation per incident.',
    },
    {
      name: 'Food loss',
      verb: 'proves what it saved',
      body: 'Expected loss without the intervention minus expected loss with it, in kg and QAR.',
    },
  ],
}

export const scenario = {
  eyebrow: 'The demo',
  title: 'One truck. One failure. One decision.',
  body:
    'T102 loses its refrigeration in transit. The system detects it, measures the damage, predicts the risk, chooses a cold store, diverts, and proves how much food it saved.',
  savedNote: 'Computed live by the food-loss engine. Run the scenario to see it.',
}

export const network = {
  eyebrow: 'Live fleet',
  title: 'A decision surface, not a dashboard of charts.',
  body:
    'A live map of every truck and every cold store in range, with an incident the instant a temperature leaves the safe band and stays there.',
}

export const trust = {
  eyebrow: 'Trust',
  title: 'Every value knows where it came from.',
  body:
    'Synthetic demo data is never dressed up as a real measurement, and literature values are marked as unverified. The language model explains the numbers. It is never allowed to invent one.',
  tags: [
    { tag: 'MEASURED', body: 'Read from a sensor.' },
    { tag: 'CALCULATED', body: 'Deterministic Python: exposure, deterioration, shelf life.' },
    { tag: 'PREDICTED', body: 'A model estimate, with its probability.' },
    { tag: 'OPTIMIZED', body: 'Chosen by the optimizer under hard constraints.' },
    { tag: 'AI-EXPLAINED', body: 'Prose about code-computed facts. No new numbers.' },
    { tag: 'SYNTHETIC', body: 'Simulated for the demo, and labelled as such.' },
  ],
}

export const architecture = {
  eyebrow: 'Architecture',
  title: 'Nothing that cannot run on a laptop in a warehouse office.',
  body:
    'Mosquitto, Postgres, Redis, Python and React. With no API key the system still runs end to end. Only the prose is plainer. 17 openly licensed data sources cover geography, routing, weather, food science and emissions.',
  flow: ['Sensors', 'MQTT', 'FastAPI ingest', 'Postgres + Redis', 'Intelligence engine', 'REST + WebSocket', 'Command center'],
  command: 'make demo',
}

export const cta = {
  title: 'One operator. One month. Twenty pallets.',
  body: 'On day one we can tell you how much of your loss is refrigeration and how much is scheduling.',
  button: 'Open the command center',
}

export const footer = {
  disclaimer:
    'Demo figures are simulated. Background footage is AI-generated and illustrative. Literature values are cited, not certified thresholds.',
}
