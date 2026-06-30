import type { API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, Service, WithUUID } from 'homebridge';
import type { AlertState, QingpingReading } from '../types';

type ServiceConstructor = WithUUID<typeof Service>;
type CharacteristicConstructor = WithUUID<new () => Characteristic>;

export class MonitorAccessory {
  private readonly Service: typeof Service;
  private readonly Characteristic: typeof Characteristic;
  private readonly services = new Map<string, Service>();

  constructor(
    private readonly log: Logger,
    private readonly api: API,
    private readonly accessory: PlatformAccessory,
    private readonly platform: DynamicPlatformPlugin,
    private readonly exposeNoiseAsLightSensor: boolean,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.setupInformationService();
    this.setupSensorServices();
    this.setupAlertServices();
  }

  update(reading: QingpingReading, alerts: AlertState): void {
    this.accessory.displayName = reading.name;

    this.updateOptional('temperature', this.Characteristic.CurrentTemperature, reading.temperatureC, -40, 100);
    this.updateOptional('humidity', this.Characteristic.CurrentRelativeHumidity, reading.humidityPercent, 0, 100);
    this.updateOptional('noise', this.Characteristic.CurrentAmbientLightLevel, reading.noiseDb, 0.0001, 150);
    this.updateBattery(reading);
    this.updateAirQuality(reading);
    this.updateCarbonDioxide(reading, alerts);
    this.updateAlerts(alerts);
  }

  private setupInformationService(): void {
    this.accessory.getService(this.Service.AccessoryInformation)
      ?? this.accessory.addService(this.Service.AccessoryInformation);

    this.accessory.getService(this.Service.AccessoryInformation)!
      .setCharacteristic(this.Characteristic.Manufacturer, 'Qingping')
      .setCharacteristic(this.Characteristic.Model, 'Air Monitor 2 / Qingping Cloud')
      .setCharacteristic(this.Characteristic.SerialNumber, this.accessory.UUID);
  }

  private setupSensorServices(): void {
    this.services.set('temperature', this.getService(this.Service.TemperatureSensor, 'Temperature', 'temperature'));
    this.services.set('humidity', this.getService(this.Service.HumiditySensor, 'Humidity', 'humidity'));
    this.services.set('airQuality', this.getService(this.Service.AirQualitySensor, 'Air Quality', 'airQuality'));
    this.services.set('co2', this.getService(this.Service.CarbonDioxideSensor, 'CO2', 'co2'));
    this.services.set('battery', this.getService(this.Service.Battery, 'Battery', 'battery'));

    if (this.exposeNoiseAsLightSensor) {
      const noise = this.getService(this.Service.LightSensor, 'Noise Level', 'noise');
      noise.setCharacteristic(this.Characteristic.Name, 'Noise Level');
      this.services.set('noise', noise);
    }
  }

  private setupAlertServices(): void {
    for (const alert of [
      ['ventilationNeeded', 'Ventilation Needed'],
      ['airPurifierRecommended', 'Air Purifier Recommended'],
      ['humidifierRecommended', 'Humidifier Recommended'],
      ['dehumidifierRecommended', 'Dehumidifier Recommended'],
      ['quietModeRecommended', 'Quiet Mode Recommended'],
      ['deviceStale', 'Qingping Cloud Stale'],
    ] as const) {
      this.services.set(alert[0], this.getService(this.Service.OccupancySensor, alert[1], alert[0]));
    }
  }

  private getService(ServiceClass: ServiceConstructor, name: string, subtype: string): Service {
    let service = this.accessory.getServiceById(ServiceClass, subtype);
    if (!service) {
      service = this.accessory.addService(ServiceClass, name, subtype);
    }
    service.setCharacteristic(this.Characteristic.Name, name);
    this.setConfiguredName(service, name);
    return service;
  }

  private setConfiguredName(service: Service, name: string): void {
    const configuredName = this.Characteristic.ConfiguredName;
    if (!configuredName) {
      return;
    }

    if (!service.testCharacteristic(configuredName)) {
      service.addCharacteristic(configuredName);
    }
    service.setCharacteristic(configuredName, name);
  }

  private updateAirQuality(reading: QingpingReading): void {
    const service = this.services.get('airQuality');
    if (!service) {
      return;
    }

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

  private updateCarbonDioxide(reading: QingpingReading, alerts: AlertState): void {
    const service = this.services.get('co2');
    if (!service) {
      return;
    }

    service.updateCharacteristic(
      this.Characteristic.CarbonDioxideDetected,
      alerts.co2High
        ? this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
        : this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL,
    );

    if (reading.co2Ppm !== undefined) {
      service.updateCharacteristic(this.Characteristic.CarbonDioxideLevel, clamp(reading.co2Ppm, 0, 100000));
    }
  }

  private updateBattery(reading: QingpingReading): void {
    const service = this.services.get('battery');
    if (!service) {
      return;
    }

    if (reading.batteryPercent !== undefined) {
      service.updateCharacteristic(this.Characteristic.BatteryLevel, clamp(reading.batteryPercent, 0, 100));
      service.updateCharacteristic(
        this.Characteristic.StatusLowBattery,
        reading.batteryPercent < 20
          ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
          : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
      );
    }

    if (reading.charging !== undefined) {
      service.updateCharacteristic(
        this.Characteristic.ChargingState,
        reading.charging
          ? this.Characteristic.ChargingState.CHARGING
          : this.Characteristic.ChargingState.NOT_CHARGING,
      );
    }
  }

  private updateAlerts(alerts: AlertState): void {
    this.updateOccupancy('ventilationNeeded', alerts.ventilationNeeded);
    this.updateOccupancy('airPurifierRecommended', alerts.airPurifierRecommended);
    this.updateOccupancy('humidifierRecommended', alerts.humidifierRecommended);
    this.updateOccupancy('dehumidifierRecommended', alerts.dehumidifierRecommended);
    this.updateOccupancy('quietModeRecommended', alerts.quietModeRecommended);
    this.updateOccupancy('deviceStale', alerts.stale);
  }

  private updateOptional(
    serviceKey: string,
    characteristic: CharacteristicConstructor,
    value: number | undefined,
    min: number,
    max: number,
  ): void {
    const service = this.services.get(serviceKey);
    if (!service || value === undefined) {
      return;
    }
    service.updateCharacteristic(characteristic, clamp(value, min, max));
  }

  private updateOccupancy(serviceKey: string, active: boolean): void {
    const service = this.services.get(serviceKey);
    if (!service) {
      return;
    }
    service.updateCharacteristic(
      this.Characteristic.OccupancyDetected,
      active
        ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
        : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
    );
  }

  private airQualityFromPm25(pm25: number | undefined): number {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
