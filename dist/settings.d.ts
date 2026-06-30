export declare const PLATFORM_NAME = "QingpingAirMonitorPlus";
export declare const PLUGIN_NAME = "homebridge-qingping-air-monitor-plus";
export declare const DEFAULT_TOKEN_URL = "https://oauth.cleargrass.com/oauth2/token";
export declare const DEFAULT_DEVICES_URL = "https://apis.cleargrass.com/v1/apis/devices";
export declare const DEFAULT_POLL_INTERVAL_SECONDS = 300;
export declare const MIN_POLL_INTERVAL_SECONDS = 30;
export declare const DEFAULT_THRESHOLDS: {
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
};
