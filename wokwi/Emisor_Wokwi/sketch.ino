#include <OneWire.h>
#include <DallasTemperature.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <WiFi.h>
#include <PubSubClient.h>

const int TEMP = 4, PH = 34, OD = 35;
const int AZUL = 2, VERDE = 18, AMARILLO = 19, ROJO = 23;
const char* BROKER = "broker.emqx.io";
const char* DATOS = "aquabocachico/g3/v43/478159149049553921/datos";
const char* ACUSE = "aquabocachico/g3/v43/478159149049553921/acuse";

OneWire bus(TEMP);
DallasTemperature sensor(&bus);
Adafruit_ILI9341 pantalla(&SPI, 27, 5, -1);
WiFiClient wifi;
PubSubClient mqtt(wifi);
char cliente[36];
unsigned long lecturaAnterior = 0, intentoMQTT = 0, intentoWiFi = 0, apagarAzul = 0;
unsigned long secuencia = 0;

const char* clasificar(float t, float ph, float od) {
  if (t < 26 || t > 30 || ph < 6.5 || ph > 7.5 || od <= 4.5) return "CRITICO";
  if (t < 26.5 || t > 29.5 || ph < 6.8 || ph > 7.2 || od <= 5.0) return "ADVERTENCIA";
  return "NORMAL";
}

void iniciarPantalla() {
  pantalla.begin();
  pantalla.setRotation(0);
  pantalla.fillScreen(ILI9341_BLACK);
  pantalla.fillRect(0, 0, 240, 47, ILI9341_NAVY);
  pantalla.setTextColor(ILI9341_WHITE);
  pantalla.setTextSize(2);
  pantalla.setCursor(42, 15);
  pantalla.print("AQUABOCACHICO");
  pantalla.setTextColor(ILI9341_CYAN);
  pantalla.setCursor(14, 60); pantalla.print("TEMPERATURA");
  pantalla.setCursor(14, 130); pantalla.print("PH DEL AGUA");
  pantalla.setCursor(14, 200); pantalla.print("OXIGENO DISUELTO");
}

void mostrar(float t, float ph, float od, const char* estado) {
  pantalla.setTextColor(ILI9341_WHITE);
  pantalla.setTextSize(3);
  pantalla.fillRect(10, 83, 220, 35, ILI9341_BLACK);
  pantalla.setCursor(14, 86); pantalla.print(t, 1); pantalla.print(" C");
  pantalla.fillRect(10, 153, 220, 35, ILI9341_BLACK);
  pantalla.setCursor(14, 156); pantalla.print(ph, 2);
  pantalla.fillRect(10, 223, 220, 35, ILI9341_BLACK);
  pantalla.setCursor(14, 225); pantalla.print(od, 2);
  pantalla.setTextSize(1); pantalla.print(" mg/L");
  uint16_t color = strcmp(estado, "CRITICO") == 0 ? ILI9341_RED :
                   strcmp(estado, "ADVERTENCIA") == 0 ? ILI9341_YELLOW : ILI9341_GREEN;
  pantalla.fillRoundRect(10, 266, 220, 46, 7, color);
  pantalla.setTextColor(ILI9341_BLACK);
  pantalla.setTextSize(2);
  pantalla.setCursor((240 - strlen(estado) * 12) / 2, 281);
  pantalla.print(estado);
}

void recibirAcuse(char* topico, byte* mensaje, unsigned int largo) {
  if (strcmp(topico, ACUSE) != 0 || largo < 5 || largo > 20) return;
  char texto[21];
  memcpy(texto, mensaje, largo);
  texto[largo] = '\0';
  if (strncmp(texto, "ACK:", 4) == 0) Serial.printf("ACK receptor: %s\n", texto + 4);
}

void conectar() {
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
      mqtt.subscribe(ACUSE);
      Serial.println("MQTT conectado");
    } else {
      Serial.printf("MQTT sin conexion (%d)\n", mqtt.state());
    }
  }
  if (mqtt.connected()) mqtt.loop();
}

void setup() {
  Serial.begin(115200);
  for (int pin : {AZUL, VERDE, AMARILLO, ROJO}) pinMode(pin, OUTPUT);
  analogReadResolution(12);
  sensor.begin();
  sensor.setResolution(11);
  SPI.begin(14, -1, 13, 5);
  iniciarPantalla();
  WiFi.mode(WIFI_STA);
  WiFi.begin("Wokwi-GUEST", "", 6);
  mqtt.setServer(BROKER, 1883);
  mqtt.setBufferSize(256);
  mqtt.setKeepAlive(45);
  mqtt.setCallback(recibirAcuse);
  snprintf(cliente, sizeof(cliente), "AB-EM-%08lX-%04lX",
           (unsigned long)(ESP.getEfuseMac() & 0xffffffff),
           (unsigned long)(esp_random() & 0xffff));
  Serial.println("AquaBocachico: MQTT/Wi-Fi simulado (no LoRa)");
}

void loop() {
  delay(10);
  conectar();
  if (apagarAzul && millis() >= apagarAzul) {
    digitalWrite(AZUL, LOW);
    apagarAzul = 0;
  }
  if (millis() - lecturaAnterior < 1800) return;
  lecturaAnterior = millis();

  sensor.requestTemperatures();
  float t = sensor.getTempCByIndex(0);
  if (t == DEVICE_DISCONNECTED_C || t < -50 || t > 125) {
    Serial.println("Error en DS18B20");
    return;
  }
  float ph = 6.0 + analogRead(PH) * 2.0 / 4095.0;
  float od = 2.0 + analogRead(OD) * 6.0 / 4095.0;
  const char* estado = clasificar(t, ph, od);
  digitalWrite(VERDE, strcmp(estado, "NORMAL") == 0);
  digitalWrite(AMARILLO, strcmp(estado, "ADVERTENCIA") == 0);
  digitalWrite(ROJO, strcmp(estado, "CRITICO") == 0);
  mostrar(t, ph, od, estado);

  char json[180];
  snprintf(json, sizeof(json),
           "{\"T\":%.2f,\"pH\":%.2f,\"OD\":%.2f,\"Estado\":\"%s\",\"seq\":%lu,\"origen\":\"AquaBocachico-G3\"}",
           t, ph, od, estado, ++secuencia);
  bool enviado = mqtt.connected() && mqtt.publish(DATOS, json);
  Serial.printf("%s | %s\n", json, enviado ? "MQTT enviado" : "MQTT sin enviar");
  digitalWrite(AZUL, HIGH);
  apagarAzul = millis() + 150;
}
