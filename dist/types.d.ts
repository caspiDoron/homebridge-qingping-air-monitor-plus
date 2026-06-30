export interface QingpingPlatformConfig {
    platform: string;
    name?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    tokenUrl?: string;
    devicesUrl?: string;
    deviceId?: string;
    deviceName?: string;
    pollIntervalSeconds?: number;
    exposeNoiseAsLightSensor?: boolean;
    exposeMetricTilesAsLightSensors?: boolean;
    enableHistory?: boolean;
    historyRetentionDays?: number;
    thresholds?: Partial<AlertThresholds>;
}
export interface AlertThresholds {
    co2DetectPpm: number;
    co2ClearPpm: number;
    pm25Poor: number;
    pm10Poor: number;
    tvocPoor: number;
    humidityLow: number;
    humidityHigh: number;
    temperatureLow: number;
    temperatureHigh: number;
    noiseHighDb: number;
    staleAfterMinutes: number;
}
export interface QingpingReading {
    id: string;
    name: string;
    timestamp: string;
    temperatureC?: number;
    humidityPercent?: number;
    co2Ppm?: number;
    pm25?: number;
    pm10?: number;
    tvoc?: number;
    noiseDb?: number;
    batteryPercent?: number;
    charging?: boolean;
    online: boolean;
    raw?: unknown;
}
export interface AlertState {
    co2High: boolean;
    particulateHigh: boolean;
    vocHigh: boolean;
    humidityLow: boolean;
    humidityHigh: boolean;
    temperatureLow: boolean;
    temperatureHigh: boolean;
    noiseHigh: boolean;
    stale: boolean;
    ventilationNeeded: boolean;
    airPurifierRecommended: boolean;
    humidifierRecommended: boolean;
    dehumidifierRecommended: boolean;
    quietModeRecommended: boolean;
}
export interface OAuthToken {
    accessToken: string;
    expiresAt: number;
}
