import type { API, DynamicPlatformPlugin, Logger, PlatformAccessory } from 'homebridge';
import type { AlertState, QingpingReading } from '../types';
export declare class MonitorAccessory {
    private readonly log;
    private readonly api;
    private readonly accessory;
    private readonly platform;
    private readonly exposeNoiseAsLightSensor;
    private readonly Service;
    private readonly Characteristic;
    private readonly services;
    constructor(log: Logger, api: API, accessory: PlatformAccessory, platform: DynamicPlatformPlugin, exposeNoiseAsLightSensor: boolean);
    update(reading: QingpingReading, alerts: AlertState): void;
    private setupInformationService;
    private setupSensorServices;
    private setupAlertServices;
    private getService;
    private setConfiguredName;
    private updateAirQuality;
    private updateCarbonDioxide;
    private updateBattery;
    private updateAlerts;
    private updateOptional;
    private updateOccupancy;
    private airQualityFromPm25;
}
