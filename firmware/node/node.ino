/*
 * Thermal Trace sensor node - NodeMCU ESP8266 (ESP-12E) + DHT11
 *
 * Takes the place of one truck in the fleet (T101 by default) and publishes
 * the same telemetry message the simulator does, every 3 s, to
 *     coldchain/trucks/T101/telemetry
 *     {"deviceId":"TRUCK-T101","truckId":"T101","timestamp":"2026-10-25T12:00:00Z",
 *      "temperatureC":3.4,"humidityPct":86,"latitude":25.23600,"longitude":51.47200,
 *      "speedKmh":0.0,"gForce":0.00,"doorOpen":false,"refrigerationOn":true}
 *
 * Temperature and humidity are measured, and so is the lid with the optional
 * switch. The node has no GPS, accelerometer or compressor, so its position is
 * fixed (PARK_LAT/PARK_LON), speed and g-force are 0, and refrigerationOn is
 * always true: the ice packs are the cooling.
 *
 * Device events go to coldchain/trucks/T101/events: SENSOR_FAULT when the
 * DHT11 stops answering, DOOR_OPENED / DOOR_CLOSED when the lid switch changes.
 *
 * Start the simulator with CC_REAL_TRUCKS=T101 so it leaves this truck alone.
 * The backend rejects readings more than 2 minutes off the real time, so the
 * node waits for NTP before it publishes: the Wi-Fi network needs internet.
 *
 * Wiring
 *   DHT11 +/VCC  -> 3V3
 *   DHT11 -/GND  -> G
 *   DHT11 S/DATA -> D2 (GPIO4)
 *   optional lid switch between D5 (GPIO14) and G: closed lid = contact closed
 *
 * Arduino IDE 2
 *   Boards Manager URL  http://arduino.esp8266.com/stable/package_esp8266com_index.json
 *   Board               NodeMCU 1.0 (ESP-12E Module)
 *   Libraries           DHT sensor library (Adafruit), Adafruit Unified Sensor,
 *                       PubSubClient 2.8 or newer
 *
 * The Wi-Fi password lives here and nowhere else in the project. Do not commit
 * a real one: fill it in on the demo laptop just before the event.
 */

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <time.h>

// ---------------------------------------------------------------- settings
const char* WIFI_SSID  = "YOUR_HOTSPOT";      // 2.4 GHz only - the ESP8266 has no 5 GHz
const char* WIFI_PASS  = "YOUR_PASSWORD";
const char* MQTT_HOST  = "192.168.1.50";      // the laptop's fixed IP on the demo network
const uint16_t MQTT_PORT = 1883;
const char* NTP_SERVER = "pool.ntp.org";

// Must match a row of data/trucks.csv: its id and its device_id.
const char* TRUCK_ID  = "T101";
const char* DEVICE_ID = "TRUCK-T101";
const char* CLIENT_ID = "thermal-trace-node1";

// Where the box is parked: the Central Warehouse (WH01), where T101's route starts.
const float PARK_LAT = 25.236;
const float PARK_LON = 51.472;

const uint8_t DHT_PIN  = 4;                   // D2
const uint8_t DOOR_PIN = 14;                  // D5, optional lid switch (LOW = closed)
const bool    HAS_DOOR_SWITCH = false;        // set true once the switch is fitted

const unsigned long PUBLISH_MS   = 3000;      // one reading every 3 s, like the simulator
const unsigned long RETRY_MS     = 1000;      // between reconnect attempts
const uint8_t       LED_PIN      = LED_BUILTIN;   // on = not connected

// The wire contract (backend/schemas.py TelemetryIn and backend/ingest/events.py).
// tests/test_firmware.py fills these in and runs them through the backend's
// own validators, so keep each one a single constant.
const char* TELEMETRY_TOPIC_FMT = "coldchain/trucks/%s/telemetry";
const char* EVENTS_TOPIC_FMT    = "coldchain/trucks/%s/events";
const char* TELEMETRY_FMT =
  "{\"deviceId\":\"%s\",\"truckId\":\"%s\",\"timestamp\":\"%s\","
  "\"temperatureC\":%.1f,\"humidityPct\":%.0f,"
  "\"latitude\":%.5f,\"longitude\":%.5f,"
  "\"speedKmh\":0.0,\"gForce\":0.00,"
  "\"doorOpen\":%s,\"refrigerationOn\":true}";
const char* EVENT_FMT =
  "{\"deviceId\":\"%s\",\"truckId\":\"%s\",\"timestamp\":\"%s\","
  "\"type\":\"%s\",\"detail\":\"%s\"}";

DHT dht(DHT_PIN, DHT11);
WiFiClient net;
PubSubClient mqtt(net);

char telemetryTopic[48];
char eventsTopic[48];

unsigned long lastPublish = 0;
unsigned long lastRetry   = 0;
unsigned long published   = 0;
bool sensorFault = false;                     // a SENSOR_FAULT event has been sent
bool lastDoor    = false;                     // the lid state the backend last heard

// ------------------------------------------------------------------ helpers
void setLed(bool on) { digitalWrite(LED_PIN, on ? LOW : HIGH); }   // active low

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  setLed(true);
  if (millis() - lastRetry < RETRY_MS) return;
  lastRetry = millis();
  Serial.printf("wifi: reconnecting to %s\n", WIFI_SSID);
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void ensureMqtt() {
  if (WiFi.status() != WL_CONNECTED || mqtt.connected()) return;
  if (millis() - lastRetry < RETRY_MS) return;
  lastRetry = millis();
  Serial.printf("mqtt: connecting to %s:%u ... ", MQTT_HOST, MQTT_PORT);
  if (mqtt.connect(CLIENT_ID)) {
    Serial.println("ok");
  } else {
    Serial.printf("failed, state %d\n", mqtt.state());
  }
}

bool doorOpen() {
  if (!HAS_DOOR_SWITCH) return false;
  return digitalRead(DOOR_PIN) == HIGH;       // open contact = lid lifted
}

// The backend rejects readings more than 2 minutes off, so no time, no reading.
bool utcNow(char* out, size_t len) {
  time_t now = time(nullptr);
  if (now < 1700000000) return false;         // NTP has not answered yet
  struct tm utc;
  gmtime_r(&now, &utc);
  strftime(out, len, "%Y-%m-%dT%H:%M:%SZ", &utc);
  return true;
}

bool publishEvent(const char* ts, const char* type, const char* detail) {
  char msg[200];
  snprintf(msg, sizeof(msg), EVENT_FMT, DEVICE_ID, TRUCK_ID, ts, type, detail);
  bool ok = mqtt.connected() && mqtt.publish(eventsTopic, msg);
  Serial.printf("event %s: %s\n", ok ? "sent" : "NOT sent", msg);
  return ok;
}

// -------------------------------------------------------------------- setup
void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.println();
  Serial.printf("Thermal Trace node starting as %s\n", TRUCK_ID);

  pinMode(LED_PIN, OUTPUT);
  setLed(true);
  if (HAS_DOOR_SWITCH) pinMode(DOOR_PIN, INPUT_PULLUP);

  snprintf(telemetryTopic, sizeof(telemetryTopic), TELEMETRY_TOPIC_FMT, TRUCK_ID);
  snprintf(eventsTopic, sizeof(eventsTopic), EVENTS_TOPIC_FMT, TRUCK_ID);

  dht.begin();
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  configTime(0, 0, NTP_SERVER);               // UTC; syncs once Wi-Fi is up

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);                    // the default 256 bytes is too small
  mqtt.setKeepAlive(15);
  mqtt.setSocketTimeout(5);
}

// --------------------------------------------------------------------- loop
void loop() {
  ensureWifi();
  ensureMqtt();
  mqtt.loop();
  setLed(!mqtt.connected());

  if (millis() - lastPublish < PUBLISH_MS) return;
  lastPublish = millis();

  char ts[24];
  if (!utcNow(ts, sizeof(ts))) {
    Serial.println("ntp: waiting for the time, nothing published yet");
    return;
  }

  bool door = doorOpen();
  if (door != lastDoor && publishEvent(ts, door ? "DOOR_OPENED" : "DOOR_CLOSED", "lid switch")) {
    lastDoor = door;
  }

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  // A failed read is reported, never guessed: one SENSOR_FAULT event when the
  // DHT11 stops answering, and no telemetry until it answers again.
  if (isnan(t) || isnan(h)) {
    if (!sensorFault && publishEvent(ts, "SENSOR_FAULT", "DHT11 read failed")) {
      sensorFault = true;
    }
    Serial.println("dht: read failed, no reading published");
    return;
  }
  sensorFault = false;

  char msg[320];
  snprintf(msg, sizeof(msg), TELEMETRY_FMT,
           DEVICE_ID, TRUCK_ID, ts, t, h, PARK_LAT, PARK_LON, door ? "true" : "false");

  if (mqtt.connected() && mqtt.publish(telemetryTopic, msg)) {
    published++;
  } else {
    Serial.println("mqtt: publish failed, will retry");
  }
  Serial.printf("%lu %s\n", published, msg);
}
