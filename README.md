# AquaBocachico

Sistema de monitoreo de calidad del agua para estanques de bocachico. El ESP32 simulado en Wokwi envía temperatura, pH y oxígeno disuelto mediante MQTT. El backend recibe los datos, verifica las alertas y los muestra en un panel web.

**Panel:** https://aquabocachico-fase4.onrender.com

**Diseño de interfaz:** https://www.figma.com/design/UGPXtLFhaii85CogDqnVQN

## Componentes

- `src/`: recepción MQTT, validación y API.
- `public/`: interfaz web.
- `test/`: pruebas automáticas.
- `data/`: historial temporal de lecturas.

## Ejecutar y probar

```bash
npm install
npm start
npm test
```

## Alcance

El emisor actual corresponde al **Estanque 01**. Los estanques 02 y 03 no tienen lecturas hasta conectar nuevos emisores.

La comunicación probada utiliza **MQTT sobre Wi-Fi simulado**; la transmisión LoRa sigue pendiente de validación. El almacenamiento en el alojamiento gratuito es temporal.
