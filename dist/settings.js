"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_THRESHOLDS = exports.MIN_POLL_INTERVAL_SECONDS = exports.DEFAULT_POLL_INTERVAL_SECONDS = exports.DEFAULT_DEVICES_URL = exports.DEFAULT_TOKEN_URL = exports.PLUGIN_NAME = exports.PLATFORM_NAME = void 0;
exports.PLATFORM_NAME = 'QingpingAirMonitorPlus';
exports.PLUGIN_NAME = 'homebridge-qingping-air-monitor-plus';
exports.DEFAULT_TOKEN_URL = 'https://oauth.cleargrass.com/oauth2/token';
exports.DEFAULT_DEVICES_URL = 'https://apis.cleargrass.com/v1/apis/devices';
exports.DEFAULT_POLL_INTERVAL_SECONDS = 300;
exports.MIN_POLL_INTERVAL_SECONDS = 30;
exports.DEFAULT_THRESHOLDS = {
    co2DetectPpm: 1000,
    co2ClearPpm: 900,
    pm25Poor: 35,
    pm10Poor: 100,
    tvocPoor: 300,
    humidityLow: 35,
    humidityHigh: 65,
    temperatureLow: 18,
    temperatureHigh: 28,
    noiseHighDb: 60,
    staleAfterMinutes: 20,
};
