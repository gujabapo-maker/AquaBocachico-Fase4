# Integración del sistema

AquaBocachico utiliza un ESP32 simulado en Wokwi para enviar temperatura, pH y oxígeno disuelto mediante MQTT. El backend desarrollado en Node.js recibe las lecturas, valida los valores, identifica las variables en alerta y las presenta en una interfaz web basada en Figma.

Actualmente, las lecturas corresponden al Estanque 01. Los demás estanques aún no tienen emisores asociados. Se reportaron 15 pruebas correctas de clasificación de estados; la medición de latencia de extremo a extremo y la transmisión LoRa todavía no están validadas. El historial se almacena temporalmente para la demostración.
