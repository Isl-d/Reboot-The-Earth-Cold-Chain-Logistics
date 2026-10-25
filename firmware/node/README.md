# The sensor node

One NodeMCU ESP8266 with a DHT11, taped inside the lid of a cooler box with two
ice packs. It takes the place of truck **T101** (700 kg of chicken, the healthy
reference truck) and publishes the same message the simulator does, so nothing
downstream changes.

## Wiring

| DHT11 pin | NodeMCU pin |
| --- | --- |
| + / VCC | 3V3 |
| − / GND | G |
| S / OUT / DATA | D2 (GPIO4) |

Optional lid switch: between D5 (GPIO14) and G, then set `HAS_DOOR_SWITCH` to
`true`. Without it `doorOpen` is always `false`.

## Flashing

1. Arduino IDE 2 → Preferences → Additional Boards Manager URLs:
   `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
2. Boards Manager → **esp8266 by ESP8266 Community** → install.
3. Board: **NodeMCU 1.0 (ESP-12E Module)**. Use a **data** USB cable; install the
   CP210x or CH340 driver if no port appears.
4. Library Manager: **DHT sensor library** (Adafruit), **Adafruit Unified
   Sensor**, **PubSubClient** 2.8 or newer.
5. Fill in `WIFI_SSID`, `WIFI_PASS` and `MQTT_HOST` (the laptop's fixed IP), then
   upload. Serial Monitor at **115200**.

The Wi-Fi password lives in this file and nowhere else in the project. Fill it
in on the demo laptop and do not commit it.

## Running it with the rest of the stack

The simulator would otherwise keep publishing T101 too, and the two would
fight. Tell it to leave T101 alone:

```bash
echo CC_REAL_TRUCKS=T101 >> .env      # docker compose reads it
make demo                             # or: docker compose up -d simulator

CC_REAL_TRUCKS=T101 make dev-sim      # the simulator on the host instead
```

To go back to a fully simulated fleet (for example if the board fails on
stage), remove the line and restart the simulator: `docker compose up -d simulator`.

## What it sends

Every 3 s, to `coldchain/trucks/T101/telemetry`:

```json
{"deviceId":"TRUCK-T101","truckId":"T101","timestamp":"2026-10-25T12:00:00Z",
 "temperatureC":3.4,"humidityPct":86,"latitude":25.23600,"longitude":51.47200,
 "speedKmh":0.0,"gForce":0.00,"doorOpen":false,"refrigerationOn":true}
```

| Field | Where it comes from |
| --- | --- |
| `temperatureC`, `humidityPct` | **Measured** by the DHT11 (about ±2 °C, ±5 % RH) |
| `doorOpen` | **Measured** with the lid switch; always `false` without it |
| `timestamp` | The node's clock, set by NTP (UTC) |
| `latitude`, `longitude` | **Fixed**: the box is parked at the Central Warehouse |
| `speedKmh`, `gForce` | **Fixed** at 0: there is no GPS or accelerometer |
| `refrigerationOn` | **Fixed** at `true`: the ice packs are the cooling |

Device events go to `coldchain/trucks/T101/events`:

- `SENSOR_FAULT` once, when the DHT11 stops answering. No telemetry is sent
  until it answers again: the node never invents a reading.
- `DOOR_OPENED` / `DOOR_CLOSED` when the lid switch changes.

`tests/test_firmware.py` fills in the message formats from `node.ino` and runs
them through the backend's validators, so the node and the backend cannot drift
apart again.

## Checks before the demo

```bash
mosquitto_sub -h localhost -t 'coldchain/trucks/T101/#' -v   # readings arriving?
curl -s localhost:8000/api/trucks/T101                        # the backend sees them
```

- **Nothing published and the Serial Monitor says `ntp: waiting for the
  time`?** The network has no internet. The backend rejects readings more than
  2 minutes off the real time, so the node waits for NTP. Use a phone hotspot
  with mobile data.
- The blue LED is **on while the node is not connected**: the fastest way to see
  a problem from across the room.
- Resting temperature in the closed box should settle **below 4 °C**, T101's
  safe maximum for chicken. Write down what it actually reaches.
- The DHT11 is **not waterproof**: tape it to the lid, in cold air, never against
  an ice pack and never in meltwater.
- The ESP8266 is **2.4 GHz only**. A phone hotspot set to 5 GHz will not appear.
