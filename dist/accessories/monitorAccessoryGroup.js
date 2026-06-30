"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorAccessoryGroup = void 0;
class MonitorAccessoryGroup {
    log;
    api;
    getAccessory;
    exposeNoiseAsLightSensor;
    exposeMetricTilesAsLightSensors;
    Service;
    Characteristic;
    constructor(log, api, getAccessory, exposeNoiseAsLightSensor, exposeMetricTilesAsLightSensors) {
        this.log = log;
        this.api = api;
        this.getAccessory = getAccessory;
        this.exposeNoiseAsLightSensor = exposeNoiseAsLightSensor;
        this.exposeMetricTilesAsLightSensors = exposeMetricTilesAsLightSensors;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
    }
    update(reading, alerts) {
        this.updateTemperature(reading);
        this.updateHumidity(reading);
        this.updateAirQuality(reading);
        this.updateCarbonDioxide(reading, alerts);
        this.updateBattery(reading);
        if (this.exposeNoiseAsLightSensor) {
            this.updateNoise(reading);
        }
        if (this.exposeMetricTilesAsLightSensors) {
            this.updateMetricTile('co2Tile', `${reading.name} CO2 Level`, reading.co2Ppm, 100000);
            this.updateMetricTile('pm25Tile', `${reading.name} PM2.5 Level`, reading.pm25, 1000);
            this.updateMetricTile('pm10Tile', `${reading.name} PM10 Level`, reading.pm10, 1000);
            this.updateMetricTile('tvocTile', `${reading.name} TVOC Level`, reading.tvoc, 5000);
        }
        this.updateAlert('ventilationNeeded', 'Ventilation Needed', alerts.ventilationNeeded);
        this.updateAlert('airPurifierRecommended', 'Air Purifier Recommended', alerts.airPurifierRecommended);
        this.updateAlert('humidifierRecommended', 'Humidifier Recommended', alerts.humidifierRecommended);
        this.updateAlert('dehumidifierRecommended', 'Dehumidifier Recommended', alerts.dehumidifierRecommended);
        this.updateAlert('quietModeRecommended', 'Quiet Mode Recommended', alerts.quietModeRecommended);
        this.updateAlert('cloudStale', 'Qingping Cloud Stale', alerts.stale);
    }
    updateTemperature(reading) {
        if (reading.temperatureC === undefined) {
            return;
        }
        const service = this.getPrimaryService('temperature', `${reading.name} Temperature`, this.Service.TemperatureSensor);
        service.updateCharacteristic(this.Characteristic.CurrentTemperature, clamp(reading.temperatureC, -40, 100));
    }
    updateHumidity(reading) {
        if (reading.humidityPercent === undefined) {
            return;
        }
        const service = this.getPrimaryService('humidity', `${reading.name} Humidity`, this.Service.HumiditySensor);
        service.updateCharacteristic(this.Characteristic.CurrentRelativeHumidity, clamp(reading.humidityPercent, 0, 100));
    }
    updateAirQuality(reading) {
        const service = this.getPrimaryService('airQuality', `${reading.name} Air Quality`, this.Service.AirQualitySensor);
        if (reading.pm25 !== undefined) {
            service.updateCharacteristic(this.Characteristic.PM2_5Density, clamp(reading.pm25, 0, 1000));
        }
        if (reading.pm10 !== undefined) {
            service.updateCharacteristic(this.Characteristic.PM10Density, clamp(reading.pm10, 0, 1000));
        }
        if (reading.tvoc !== undefined) {
            service.updateCharacteristic(this.Characteristic.VOCDensity, clamp(reading.tvoc, 0, 5000));
        }
        service.updateCharacteristic(this.Characteristic.AirQuality, this.airQualityFromPm25(reading.pm25));
    }
    updateCarbonDioxide(reading, alerts) {
        const service = this.getPrimaryService('co2', `${reading.name} CO2`, this.Service.CarbonDioxideSensor);
        service.updateCharacteristic(this.Characteristic.CarbonDioxideDetected, alerts.co2High
            ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
            : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
        if (reading.co2Ppm !== undefined) {
            service.updateCharacteristic(this.Characteristic.CarbonDioxideLevel, clamp(reading.co2Ppm, 0, 100000));
        }
    }
    updateBattery(reading) {
        if (reading.batteryPercent === undefined && reading.charging === undefined) {
            return;
        }
        const service = this.getPrimaryService('battery', `${reading.name} Battery`, this.Service.Battery);
        if (reading.batteryPercent !== undefined) {
            service.updateCharacteristic(this.Characteristic.BatteryLevel, clamp(reading.batteryPercent, 0, 100));
            service.updateCharacteristic(this.Characteristic.StatusLowBattery, reading.batteryPercent < 20
                ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
                : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
        }
        if (reading.charging !== undefined) {
            service.updateCharacteristic(this.Characteristic.ChargingState, reading.charging
                ? this.Characteristic.ChargingState.CHARGING
                : this.Characteristic.ChargingState.NOT_CHARGING);
        }
    }
    updateNoise(reading) {
        if (reading.noiseDb === undefined) {
            return;
        }
        const service = this.getPrimaryService('noise', `${reading.name} Noise Level`, this.Service.LightSensor);
        service.updateCharacteristic(this.Characteristic.CurrentAmbientLightLevel, clamp(reading.noiseDb, 0.0001, 150));
    }
    updateMetricTile(key, name, value, max) {
        if (value === undefined) {
            return;
        }
        const service = this.getPrimaryService(key, name, this.Service.LightSensor);
        service.updateCharacteristic(this.Characteristic.CurrentAmbientLightLevel, clamp(value, 0.0001, max));
    }
    updateAlert(key, name, active) {
        const service = this.getPrimaryService(key, name, this.Service.OccupancySensor);
        service.updateCharacteristic(this.Characteristic.OccupancyDetected, active
            ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
            : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    }
    getPrimaryService(key, name, ServiceClass) {
        const accessory = this.getAccessory(key, name);
        this.setupInformationService(accessory, name);
        let service = accessory.getService(ServiceClass);
        if (!service) {
            service = accessory.addService(ServiceClass, name, key);
        }
        service.setCharacteristic(this.Characteristic.Name, name);
        if (this.Characteristic.ConfiguredName) {
            if (!service.testCharacteristic(this.Characteristic.ConfiguredName)) {
                service.addCharacteristic(this.Characteristic.ConfiguredName);
            }
            service.setCharacteristic(this.Characteristic.ConfiguredName, name);
        }
        return service;
    }
    setupInformationService(accessory, name) {
        const service = accessory.getService(this.Service.AccessoryInformation)
            ?? accessory.addService(this.Service.AccessoryInformation);
        service
            .setCharacteristic(this.Characteristic.Manufacturer, 'Qingping')
            .setCharacteristic(this.Characteristic.Model, 'Air Monitor 2 / Qingping Cloud')
            .setCharacteristic(this.Characteristic.Name, name)
            .setCharacteristic(this.Characteristic.SerialNumber, accessory.UUID);
    }
    airQualityFromPm25(pm25) {
        if (pm25 === undefined) {
            return this.Characteristic.AirQuality.UNKNOWN;
        }
        if (pm25 < 7) {
            return this.Characteristic.AirQuality.EXCELLENT;
        }
        if (pm25 < 15) {
            return this.Characteristic.AirQuality.GOOD;
        }
        if (pm25 < 30) {
            return this.Characteristic.AirQuality.FAIR;
        }
        if (pm25 < 55) {
            return this.Characteristic.AirQuality.INFERIOR;
        }
        return this.Characteristic.AirQuality.POOR;
    }
}
exports.MonitorAccessoryGroup = MonitorAccessoryGroup;
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
