# Homebridge Qingping Air Monitor Plus

Cloud-first Homebridge plugin for Qingping Air Monitor devices, focused on useful HomeKit sensors, alert sensors, local history, and visible noise level support.

This project is currently aimed at the Qingping Air Monitor 2 used through the Qingping Home cloud app.

## Why Cloud First?

Some existing Air Monitor 2 Homebridge plugins use local Xiaomi/MIoT access with an IP address and Xiaomi token. This plugin deliberately starts with Qingping cloud credentials instead, so it does not require installing Mi Home or extracting a Xiaomi token.

Local mode may be added later only if a Qingping-native local protocol is confirmed.

## HomeKit Services

- Temperature Sensor
- Humidity Sensor
- Air Quality Sensor with PM2.5, PM10, and VOC density where available
- Carbon Dioxide Sensor
- Battery Service
- Noise Level as a Light Sensor
- Recommendation and alert sensors:
  - Ventilation Needed
  - Air Purifier Recommended
  - Humidifier Recommended
  - Dehumidifier Recommended
  - Quiet Mode Recommended
  - Qingping Cloud Stale

## Noise Level

HomeKit does not provide a native decibel sensor. When `exposeNoiseAsLightSensor` is enabled, this plugin exposes noise as a Light Sensor named `Noise Level`.

If Apple Home shows:

```text
Noise Level: 62 lux
```

read it as:

```text
Noise Level: 62 dB
```

History is still stored with the correct `noiseDb` field.

## Configuration

```json
{
  "platforms": [
    {
      "platform": "QingpingAirMonitorPlus",
      "name": "Qingping Air Monitor Plus",
      "clientId": "YOUR_QINGPING_CLIENT_ID",
      "clientSecret": "YOUR_QINGPING_CLIENT_SECRET",
      "deviceName": "Living Room",
      "pollIntervalSeconds": 300,
      "exposeNoiseAsLightSensor": true,
      "enableHistory": true
    }
  ]
}
```

If more than one device exists in the Qingping account, set `deviceId` or `deviceName`.

## Cloud API Notes

The default URLs are based on the currently observed Qingping/ClearGrass cloud pattern:

- Token URL: `https://oauth.cleargrass.com/oauth2/token`
- Devices URL: `https://apis.cleargrass.com/v1/apis/devices`

If Qingping gives you different regional/API URLs, override `tokenUrl` and `devicesUrl` in the plugin config.

The plugin logs the raw device payload in Homebridge debug mode. That is intentional for the first test phase so we can adjust the exact field mapping if Qingping returns different names for your account.

## Local History

When enabled, readings are saved as JSON Lines under the Homebridge storage directory:

```text
qingping-air-monitor-plus/history.jsonl
```

This is intended for a later dashboard/export feature. Values are stored with their real units, including `noiseDb`.

## Development

```sh
npm install
npm run build
```

## Status

Initial scaffold. The next validation step is testing with real Qingping cloud credentials and a real device payload.
