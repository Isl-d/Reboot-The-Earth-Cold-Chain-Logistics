# SaaS Plan — Thermal Trace for grocery and hypermarket chains

> How we turn the Thermal Trace demo into a product we sell to each grocery or
> hypermarket chain as a hosted service. The system shape stays as described in
> [ARCHITECTURE.md](ARCHITECTURE.md); this document covers what must change so
> many customers can use one platform safely, how we package and price it, and
> how we onboard each customer. Prices and timelines here are **planning
> assumptions**, not quotes, until pilots confirm them.

## 1. The offer in one paragraph

A grocery or hypermarket chain gives us its refrigerated trucks, distribution
centres, stores and product list. We give it a private, hosted Thermal Trace
workspace. Its control room sees every reefer truck live, gets warned before a
batch spoils, gets a costed recommendation for where to divert, and receives a
monthly report of food and money saved plus temperature records for audits.
The customer pays a monthly subscription per truck and per site. We run the
servers, the updates, the support and the model calibration.

### Who buys and who uses it

| Role at the customer | What they need from us |
|---|---|
| **Head of supply chain / logistics** (buyer) | Less spoilage, fewer rejected deliveries, a clear QAR return |
| **Food safety / QA manager** (buyer or blocker) | Unbroken temperature records, incident history, audit exports |
| **Control-room operator** (daily user) | Live map, alerts, one recommended action per incident |
| **Fleet manager** | Truck and device health, driver response times |
| **DC and store managers** | Incoming batches at risk, inventory actions (transfer, discount) |
| **IT / security** (gatekeeper) | Single sign-on, data residency, security answers, integrations |

### Why a chain would pay

- **Food saved in QAR.** The food-loss engine already computes kg and QAR saved
  per intervention. Summed per month, this is the ROI line on the invoice.
- **Earlier warning than a data logger.** Loggers tell you what went wrong after
  the truck arrives. We predict remaining safe time while it is still on the road.
- **Audit-ready records.** Every reading is stored with provenance, and rejected
  readings are kept with a reason, which is what an inspector asks for.
- **One decision, not a dashboard.** CONTINUE, MONITOR, PREPARE_INTERVENTION or
  DIVERT, with the warehouse and the cost behind it.

## 2. Where the code is today, and the gap

The pipeline, intelligence engine and UI are product-grade in shape. The
missing pieces are the ones every multi-customer service needs.

| Area | Today | Needed for SaaS |
|---|---|---|
| **Customers (tenancy)** | One global fleet. Tables in `backend/models.py` have no customer column; IDs like `T101` are global | Every row belongs to a tenant; IDs are unique per tenant; one customer can never see another's data |
| **Login** | None. Every REST route, `/ws/live`, `/api/simulation/*` and `/control` is open | Login, roles, per-tenant access on every route and on the WebSocket |
| **Device ingest** | Anonymous MQTT on `coldchain/trucks/{truckId}/…` | Per-device credentials, tenant in the topic, devices bound to a tenant |
| **Customer data setup** | Seeded from `data/*.csv` at startup | Admin screens and a CSV/API import per tenant |
| **Simulator** | Always runs alongside real data | Off for customer tenants; only in a labelled demo tenant |
| **Alerts** | In-app WebSocket only | SMS, WhatsApp and email routing with escalation |
| **Reports** | Live screens | Monthly ROI report and per-trip temperature record export (PDF/CSV) |
| **Calibration** | Product constants are literature values, `verified=no` | Per-customer, per-product calibration in each pilot |
| **External AI** | Explainer sends facts to OpenRouter | Per-tenant opt-in, data-processing terms, Laya-only mode for strict customers |
| **Operations** | `docker compose` on one machine | Hosted environment, backups, monitoring, uptime target, staged releases |
| **Billing** | None | Usage counts per tenant (trucks, sites) and invoicing |

## 3. Technical plan

### 3.1 Tenancy model

**Recommendation: one shared platform with a tenant column on every table,
enforced by PostgreSQL row-level security. Offer a dedicated instance only to
large customers who insist.**

- Add a `tenants` table and a `tenant_id` column to every domain table
  (trucks, devices, readings, batches, warehouses, stores, routes, inventory,
  incidents, predictions, actions, events, rejects).
- Make business keys unique per tenant, for example `(tenant_id, id)`, so two
  customers can both have a truck called T101.
- Turn on PostgreSQL row-level security so a query without the right tenant
  returns nothing, even if application code forgets a filter. The request sets
  the tenant on the database session from the login token.
- Prefix Redis keys with the tenant, and give each tenant its own WebSocket
  channel so `/ws/live` only fans out that tenant's events.
- Make the intelligence worker loop over tenants and use each tenant's own
  product constants and cost settings. `build_context` in `backend/context.py`
  takes a tenant as well as a truck.
- The same Docker image runs as a **dedicated instance** with one tenant for an
  enterprise customer that requires it. No code fork.

Separate databases per customer were considered and rejected for now. They
multiply migrations, backups and monitoring for a four-person team.

### 3.2 Login and roles

- Use a standard identity provider over OpenID Connect rather than storing
  passwords ourselves. Keycloak if we self-host for data residency, or a managed
  provider if speed matters more. FastAPI verifies the token on every request.
- Roles: **Owner** (billing, users), **Admin** (fleet, sites, products, alert
  rules), **Operator** (acknowledge incidents, approve diversions), **Site
  manager** (their DC or stores only), **Auditor** (read-only, exports).
- Enterprise tier adds single sign-on with the customer's Microsoft Entra ID or
  Google Workspace.
- Every human action on an incident or diversion is written to an audit log
  with who, when and what. The `actions` table is the starting point.
- The simulation and manual-control endpoints become demo-tenant only.

### 3.3 Getting customer data in

**Sensors.** Integrate first, supply hardware second.

1. **Existing reefer telematics.** Most large chains already have reefer units
   with telematics, such as Carrier Lynx, Thermo King TracKing or ORBCOMM.
   Build one adapter per provider that pulls their API and writes the same
   normalized reading our MQTT path writes. This removes the hardware sale from
   the deal.
2. **Our own node or a partner device.** For trucks without telematics, ship a
   certified gateway that publishes our MQTT message. `firmware/node/` proves
   the contract, but a DHT11 is not food-grade. A pilot needs a calibrated probe.
3. **HTTP ingest.** A signed `POST` endpoint for devices and partners that
   cannot speak MQTT.

MQTT topics become `t/{tenantId}/trucks/{truckId}/telemetry`, each device gets
its own credentials, and the broker only lets a device publish to its own
topic. The Mosquitto dynamic security plugin supports this.

**Reference data.** Fleets, routes, sites and products come in through admin
screens and a CSV import that reuses the column layout of the current
`data/*.csv` files, so our own demo files become the customer template.
Enterprise customers get an API or a scheduled sync from their ERP or WMS
(SAP, Oracle, Microsoft Dynamics) for batches, inventory and orders.

### 3.4 Alerts and reports

- **Alert rules per tenant:** which risk level or incident type alerts whom, by
  SMS, WhatsApp or email, with escalation if nobody acknowledges in N minutes.
- **Trip temperature record:** per truck trip and batch, the full reading
  history, excursions and actions taken, exported as PDF and CSV for QA and
  inspectors.
- **Monthly value report:** kg saved, QAR saved, CO₂ avoided, incidents by
  cause, response times. This is the renewal argument, so it must be precise
  and every figure must carry its provenance tag.

### 3.5 Hosting, security and data

- **Region:** host in Qatar for Qatari customers. Microsoft Azure (Qatar
  Central) and Google Cloud (Doha) both have regions there. Truck GPS can be
  linked to a driver, so treat it as potentially personal data under Qatar's
  personal data protection law and confirm with a lawyer.
- **Platform:** keep the current shape. One backend process type, PostgreSQL
  with TimescaleDB, Redis, Mosquitto. Run them as managed services where
  possible. The architecture's choice to avoid Kubernetes and Kafka still holds
  at tens of customers.
- **Must-haves before the first paid customer:** encrypted traffic, encrypted
  backups with a tested restore, uptime and error monitoring, secrets outside
  the repo, a staging environment, and data retention rules per tenant.
- **External AI:** the explainer is off by default for customer tenants and
  enabled only with written consent. Laya runs locally, so strict customers
  keep all data in region. Neither layer ever produces a number.
- **Later:** ISO 27001 or SOC 2 once enterprise buyers ask. Start keeping the
  evidence now: access reviews, change log, incident log.

## 4. Packaging and pricing

Price per **monitored truck** per month, plus per **site** for DCs and stores
that use inventory features, plus a one-time **onboarding fee**. Annual
contracts, billed monthly or yearly.

| | **Monitor** | **Predict** | **Enterprise** |
|---|---|---|---|
| Live map, readings, incidents, alerts | ✓ | ✓ | ✓ |
| Trip temperature records and audit exports | ✓ | ✓ | ✓ |
| Spoilage prediction and remaining safe time | | ✓ | ✓ |
| Diversion optimization and decisions | | ✓ | ✓ |
| Food-loss and monthly value report | | ✓ | ✓ |
| Inventory forecasting and actions | | | ✓ |
| ERP/WMS and telematics integrations | | 1 provider | Unlimited |
| Single sign-on, audit log export | | | ✓ |
| Dedicated instance option, uptime SLA | | | ✓ |
| Support | Email | Email + chat | Named contact |

**Starting price hypotheses to test in pilots** (QAR, excluding hardware):

| Item | Hypothesis |
|---|---|
| Monitor, per truck per month | 120–180 |
| Predict, per truck per month | 250–350 |
| Enterprise | Quoted; per truck plus per site |
| Onboarding and calibration | 15,000–40,000 one-time, by fleet size |

The rule for setting the final price: the subscription should cost well under
the food the customer's own pilot shows we saved. Use the pilot's measured QAR
saved per truck per month as the anchor.

**Open-source note.** The repository is MIT-licensed. Customers pay for the
hosted service, onboarding, calibration, integrations, support and SLA, not for
the code. The team should decide whether multi-tenant administration, billing,
SSO and integrations live in a private repository, an open-core split, or stay
fully open.

## 5. How we onboard each customer

1. **Discovery, 1–2 weeks.** Map their fleet, DCs, stores, products, current
   telematics and loggers, and who acts on alerts. Agree pilot success metrics.
2. **Pilot, 8–12 weeks, paid or discounted.** 5–15 trucks, one DC and its
   stores, one product family such as chilled poultry or dairy.
   - Create the tenant, import reference data, connect devices.
   - Run in shadow mode for 2 weeks: alerts go only to us and their QA lead.
   - **Calibrate** product constants and spoilage thresholds against their QA
     data. Mark them verified for that tenant only.
   - Go live with alerts to the control room.
   - Measure: detection lead time, response time, excursions, kg and QAR saved.
3. **Contract.** Pilot results become the business case and set the price.
4. **Rollout.** Remaining fleet in waves, alert routing per region, training
   for operators and site managers.
5. **Ongoing.** Monthly value report, quarterly review, recalibration when they
   add products or routes.

Each step has a checklist in the tenant admin screen so onboarding is
repeatable rather than heroic.

## 6. Roadmap

Durations are estimates for the current four-person team. Each phase ends with
something demonstrable.

### Phase 0 — Decisions (1–2 weeks)

Close the open decisions in §8. Pick the identity provider, the cloud region
and the first target customer.

### Phase 1 — Multi-customer foundations (6–8 weeks)

| Owner | Work |
|---|---|
| Person 3 (data, ingest) | `tenants` table, `tenant_id` everywhere, row-level security, migrations, tenant-scoped MQTT topics and device credentials, HTTP ingest, tenant-aware Redis keys, CSV import per tenant |
| Person 4 (intelligence) | Tenant-aware `build_context` and worker, per-tenant product constants and cost settings, explainer off unless the tenant opts in |
| Person 1 (command center) | Login, session handling, role-based navigation, tenant-scoped WebSocket client |
| Person 2 (intelligence UI) | Hide simulation outside the demo tenant, tenant settings screens for products and costs |
| Shared | Update `docs/API_CONTRACT.md`, `backend/models.py` and `frontend/src/api/types.ts` together, as CLAUDE.md requires. Tests proving tenant A can never read tenant B |

**Exit:** two test tenants with separate fleets in one deployment, and no
cross-tenant data visible through REST, WebSocket or MQTT.

### Phase 2 — Pilot-ready (6–8 weeks)

- Admin screens: users, roles, trucks, devices, sites, products, alert rules.
- SMS, WhatsApp and email alerts with escalation.
- Trip temperature record export and monthly value report.
- First telematics adapter for the pilot customer's provider.
- Hosted staging and production in region, backups, monitoring, audit log.
- Onboarding checklist and pilot playbook.

**Exit:** a real pilot customer live in shadow mode.

### Phase 3 — Commercial (ongoing)

- Usage metering and billing.
- Single sign-on, ERP/WMS sync, additional telematics adapters.
- Uptime SLA, status page, support process.
- Security certification path.
- **Expansion:** monitoring of DC cold rooms and store display fridges, which
  extends the same pipeline from the truck to the shelf.

## 7. Risks

| Risk | Mitigation |
|---|---|
| **Food-safety liability** if a prediction is wrong | Sell as decision support; a human approves every diversion; contracts state the system does not replace HACCP controls; calibrate per customer before go-live |
| **Uncalibrated constants** | Pilot calibration is mandatory and paid for; uncalibrated values stay labelled |
| **Data leak between customers** | Row-level security plus automated cross-tenant tests in `make test` |
| **Hardware dependence slows deals** | Integrate with existing telematics first |
| **Long enterprise sales cycles** | Start with a mid-size chain or one region of a large one; pilots are paid |
| **Customer data sent to an external LLM** | Off by default; Laya-only mode; written consent |
| **Small team running production** | Managed database and cache, few moving parts, staged releases |

## 8. Open decisions for the team

1. **First customer profile:** a large hypermarket chain's single region, or a
   mid-size grocery chain end to end?
2. **Licence model:** stay fully MIT, or keep SaaS-only features private?
3. **Identity provider:** self-hosted Keycloak or a managed provider?
4. **Hosting:** Azure Qatar Central or Google Cloud Doha?
5. **Hardware:** integrations only, or also resell a partner gateway?
6. **Pilot pricing:** paid, discounted, or free with a conversion commitment?
