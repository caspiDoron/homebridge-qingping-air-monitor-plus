import type { API, Logger, PlatformAccessory } from 'homebridge';
import type { AlertState, QingpingReading } from '../types';
export type AccessoryFactory = (key: string, name: string) => PlatformAccessory;
export declare class MonitorAccessoryGroup {
    private readonly log;
    private readonly api;
    private readonly getAccessory;
    private readonly exposeNoiseAsLightSensor;
    private readonly Service;
    private readonly Characteristic;
    constructor(log: Logger, api: API, getAccessory: AccessoryFactory, exposeNoiseAsLightSensor: boolean);
    update(reading: QingpingReading, alerts: AlertState): void;
    private updateTemperature;
    private updateHumidity;
    private updateAirQuality;
    private updateCarbonDioxide;
    private updateBattery;
    private updateNoise;
    private updateAlert;
    private getPrimaryService;
    private setupInformationService;
    private airQualityFromPm25;
}
