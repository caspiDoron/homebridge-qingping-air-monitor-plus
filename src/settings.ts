export const PLATFORM_NAME = 'QingpingAirMonitorPlus';
export const PLUGIN_NAME = 'homebridge-qingping-air-monitor-plus';

export const DEFAULT_TOKEN_URL = 'https://oauth.cleargrass.com/oauth2/token';
export const DEFAULT_DEVICES_URL = 'https://apis.cleargrass.com/v1/apis/devices';

export const DEFAULT_POLL_INTERVAL_SECONDS = 300;
export const MIN_POLL_INTERVAL_SECONDS = 30;

export const DEFAULT_THRESHOLDS = {
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
