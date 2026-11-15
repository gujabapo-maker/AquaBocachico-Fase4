#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* BROKER = "broker.emqx.io";
const char* DATOS = "aquabocachico/g3/v43/478159149049553921/datos";
const char* ACUSE = "aquabocachico/g3/v43/478159149049553921/acuse";
const int VERDE = 2, ROJO = 18;

WiFiClient wifi;
PubSubClient mqtt(wifi);
char cliente[36];
unsigned long intentoMQTT = 0, intentoWiFi = 0, apagarLED = 0;

void recibir(char* topico, byte* mensaje, unsigned int largo) {
  if (strcmp(topico, DATOS) != 0) return;
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, mensaje, largo);
  const char* estado = doc["Estado"] | "";
  if (error || strcmp(doc["origen"] | "", "AquaBocachico-G3") != 0 ||
      doc["T"].isNull() || doc["pH"].isNull() || doc["OD"].isNull() ||
      doc["seq"].isNull() ||
      (strcmp(estado, "NORMAL") && strcmp(estado, "ADVERTENCIA") && strcmp(estado, "CRITICO"))) {
    digitalWrite(ROJO, HIGH);
    apagarLED = millis() + 300;
    Serial.println("JSON no valido");
    return;
  }

  unsigned long seq = doc["seq"].as<unsigned long>();
  Serial.printf("RECIBIDO #%lu | %.2f C | pH %.2f | OD %.2f | %s\n",
                seq, doc["T"].as<float>(), doc["pH"].as<float>(),
                doc["OD"].as<float>(), estado);
  digitalWrite(VERDE, HIGH);
  apagarLED = millis() + 300;
  char acuse[24];
  snprintf(acuse, sizeof(acuse), "ACK:%lu", seq);
  mqtt.publish(ACUSE, acuse);
}

void setup() {
  Serial.begin(115200);
  pinMode(VERDE, OUTPUT);
  pinMode(ROJO, OUTPUT);
  WiFi.mode(WIFI_STA);
  WiFi.begin("Wokwi-GUEST", "", 6);
  mqtt.setServer(BROKER, 1883);
  mqtt.setBufferSize(256);
  mqtt.setKeepAlive(45);
  mqtt.setCallback(recibir);
  snprintf(cliente, sizeof(cliente), "AB-RX-%08lX-%04lX",
           (unsigned long)(ESP.getEfuseMac() & 0xffffffff),
           (unsigned long)(esp_random() & 0xffff));
  Serial.println("Receptor AquaBocachico: MQTT/Wi-Fi (no LoRa)");
}

void loop() {
  delay(10);
  if (apagarLED && millis() >= apagarLED) {
    digitalWrite(VERDE, LOW);
    digitalWrite(ROJO, LOW);
    apagarLED = 0;
  }
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - intentoWiFi >= 10000) {
      intentoWiFi = millis();
      WiFi.reconnect();
    }
    return;
  }
  if (!mqtt.connected() && millis() - intentoMQTT >= 4000) {
    intentoMQTT = millis();
    if (mqtt.connect(cliente)) {
      mqtt.subscribe(DATOS);
      Serial.println("MQTT conectado; esperando datos");
    } else {
      Serial.printf("MQTT sin conexion (%d)\n", mqtt.state());
    }
  }
  if (mqtt.connected()) mqtt.loop();
}
