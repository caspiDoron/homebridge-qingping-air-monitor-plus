import type { API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
export declare class QingpingAirMonitorPlusPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    private readonly accessories;
    private readonly config;
    private readonly client;
    private readonly rules;
    private readonly history?;
    private monitorAccessory?;
    private pollTimer?;
    constructor(log: Logger, config: PlatformConfig, api: API);
    configureAccessory(accessory: PlatformAccessory): void;
    private start;
    private pollOnce;
    private getOrCreateAccessory;
}
