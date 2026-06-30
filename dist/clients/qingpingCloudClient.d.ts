import type { Logger } from 'homebridge';
import type { QingpingPlatformConfig, QingpingReading } from '../types';
export declare class QingpingCloudClient {
    private readonly log;
    private readonly config;
    private token?;
    constructor(log: Logger, config: QingpingPlatformConfig);
    fetchReading(): Promise<QingpingReading>;
    private fetchDevices;
    private getAccessToken;
    private selectDevice;
}
