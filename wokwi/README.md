# Proyectos Wokwi V4.3

- Emisor: ESP32, DS18B20, potenciómetros para pH y OD, pantalla TFT e indicadores de alerta.
- Receptor: ESP32 que recibe mensajes JSON MQTT y devuelve un acuse lógico por número de secuencia.

Ambos proyectos usan el broker público `broker.emqx.io` y el mismo tema MQTT. La comunicación demostrada es MQTT/Wi-Fi simulado; la transmisión LoRa no se ha validado.

Los archivos `sketch.ino` y `libraries.txt` incluyen el firmware y las dependencias; el diagrama del circuito se aporta por separado en el paquete original V4.3 de Wokwi.
