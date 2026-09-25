# Full System Pipeline — AI Cold Chain & Food Loss Platform

Provided by the user as the end-to-end architecture. Person 2 (this repo) owns only the analytics/intelligence frontend; everything above the AI DASHBOARD is backend/other team members.

```
AI COLD CHAIN & FOOD LOSS PLATFORM
┌───────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                              │
│                                                                   │
│  🚚 Trucks          🏭 Warehouses          🛒 Hypermarkets        │
│  Temp               Temp/Humidity          Temp/Humidity          │
│  Humidity            Door                  Inventory              │
│  GPS                 Power                 Expiry dates            │
│  G-Force              RFID/Barcode          Sales/POS              │
└───────────────┬──────────────────┬───────────────────┬────────────┘
                │                  │                   │
                └──────────────────┼───────────────────┘
                                   ↓
                     ┌────────────────────────┐
                     │   IoT / Data Gateway   │
                     │ MQTT / HTTPS / LoRaWAN │
                     └────────────┬───────────┘
                                  ↓
                     ┌────────────────────────┐
                     │   EVENT STREAMING      │
                     │ Kafka / MQTT Broker     │
                     └────────────┬───────────┘
                                  ↓
              ┌───────────────────┴───────────────────┐
              │                                       │
              ↓                                       ↓
   ┌─────────────────────┐                 ┌─────────────────────┐
   │ REAL-TIME MONITORING│                 │     DATA PLATFORM   │
   │                     │                 │                     │
   │ Temperature         │                 │ Time-series DB      │
   │ Humidity             │                 │ PostgreSQL          │
   │ GPS                  │                 │ Object Storage      │
   │ Shock                │                 │ Redis               │
   │ Door                 │                 │ Historical data     │
   └──────────┬──────────┘                 └──────────┬──────────┘
              │                                       │
              └────────────────┬──────────────────────┘
                               ↓
                 ┌────────────────────────────┐
                 │       AI ENGINE            │
                 │                            │
                 │ 1. Spoilage Prediction     │
                 │ 2. Remaining Safe Time     │
                 │ 3. Anomaly Detection       │
                 │ 4. Demand Forecasting      │
                 │ 5. Food Loss Prediction    │
                 │ 6. Route Optimization      │
                 │ 7. Risk Scoring             │
                 └─────────────┬──────────────┘
                               ↓
                 ┌────────────────────────────┐
                 │     DECISION ENGINE        │
                 │                            │
                 │ Temperature breach?        │
                 │ Product at risk?           │
                 │ Warehouse nearby?          │
                 │ Route change required?     │
                 │ Discount / redistribution? │
                 └─────────────┬──────────────┘
                               ↓
          ┌────────────────────┼─────────────────────┐
          ↓                    ↓                     ↓
   🚚 REROUTE TRUCK       🏭 WAREHOUSE          🛒 STORE
   Change destination     Move inventory        Prioritize sale
   Alert driver           Adjust storage        Apply discount
   Update ETA             Quarantine            Transfer stock
          │                    │                     │
          └────────────────────┼─────────────────────┘
                               ↓
                    ┌─────────────────────┐
                    │   FOOD LOSS ENGINE  │
                    │                     │
                    │ Food saved          │
                    │ Food spoiled        │
                    │ Loss cost            │
                    │ CO₂ impact           │
                    │ Root cause           │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │     AI DASHBOARD    │
                    │                     │
                    │ Risk Map             │
                    │ Fleet                │
                    │ Inventory            │
                    │ Food-loss KPIs       │
                    │ Predictions          │
                    │ Alerts               │
                    └─────────────────────┘
```

## Refined tail of the pipeline (second diagram from the user)

```
FOOD LOSS ENGINE                 FRONTEND
  Expected loss                    Live Map        Fleet
  Prevented loss                   Sensor Graphs   Warehouse
  Food saved              →        AI Prediction   Inventory
  Financial impact                 Optimization    Food Loss
  Waste causes                     Alerts          Simulation
  CO₂ impact
```

## Ownership of frontend modules
| Module | Owner | Person 2 screen |
|---|---|---|
| Simulation | Person 2 | Simulation |
| Sensor Graphs | Person 2 | Simulation (live charts) + Model (thermal exposure) |
| AI Prediction | Person 2 | Mathematical Model |
| Optimization | Person 2 | Optimization |
| Inventory | Person 2 | Inventory |
| Food Loss | Person 2 | Food-Loss Analytics + Scenario Comparison |
| Live Map, Fleet, Alerts | Person 1 | not built here (see PERSON_1_COMMAND_CENTER.md) |
| Warehouse | most probably Person 1 (not certain) | not built here unless confirmed |
