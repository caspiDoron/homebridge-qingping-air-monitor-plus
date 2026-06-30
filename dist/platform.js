"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QingpingAirMonitorPlusPlatform = void 0;
const monitorAccessory_1 = require("./accessories/monitorAccessory");
const qingpingCloudClient_1 = require("./clients/qingpingCloudClient");
const historyStore_1 = require("./history/historyStore");
const settings_1 = require("./settings");
const ruleEngine_1 = require("./rules/ruleEngine");
class QingpingAirMonitorPlusPlatform {
    log;
    api;
    Service;
    Characteristic;
    accessories = new Map();
    config;
    client;
    rules;
    history;
    monitorAccessory;
    pollTimer;
    constructor(log, config, api) {
        this.log = log;
        this.api = api;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.config = config;
        this.client = new qingpingCloudClient_1.QingpingCloudClient(log, this.config);
        this.rules = new ruleEngine_1.RuleEngine(resolveThresholds(this.config));
        if (this.config.enableHistory !== false) {
            this.history = new historyStore_1.HistoryStore(log, api, Number(this.config.historyRetentionDays ?? 30));
        }
        this.api.on('didFinishLaunching', () => {
            this.start();
        });
        this.api.on('shutdown', () => {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
            }
        });
    }
    configureAccessory(accessory) {
        this.accessories.set(accessory.UUID, accessory);
    }
    start() {
        const pollSeconds = Math.max(settings_1.MIN_POLL_INTERVAL_SECONDS, Number(this.config.pollIntervalSeconds ?? settings_1.DEFAULT_POLL_INTERVAL_SECONDS));
        this.pollOnce();
        this.pollTimer = setInterval(() => this.pollOnce(), pollSeconds * 1000);
        this.log.info(`Qingping Air Monitor Plus polling every ${pollSeconds} seconds`);
    }
    async pollOnce() {
        try {
            const reading = await this.client.fetchReading();
            const accessory = this.getOrCreateAccessory(reading);
            if (!this.monitorAccessory) {
                this.monitorAccessory = new monitorAccessory_1.MonitorAccessory(this.log, this.api, accessory, this, this.config.exposeNoiseAsLightSensor !== false);
            }
            const alerts = this.rules.evaluate(reading);
            this.monitorAccessory.update(reading, alerts);
            this.history?.append(reading, alerts);
            this.log.debug(formatReading(reading));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.log.warn(`Qingping cloud polling failed: ${message}`);
        }
    }
    getOrCreateAccessory(reading) {
        const uuid = this.api.hap.uuid.generate(`${settings_1.PLATFORM_NAME}:${reading.id}`);
        const cached = this.accessories.get(uuid);
        if (cached) {
            return cached;
        }
        const accessory = new this.api.platformAccessory(reading.name, uuid);
        accessory.context.deviceId = reading.id;
        this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
        this.accessories.set(uuid, accessory);
        this.log.info(`Registered Qingping accessory: ${reading.name} (${reading.id})`);
        return accessory;
    }
}
exports.QingpingAirMonitorPlusPlatform = QingpingAirMonitorPlusPlatform;
function resolveThresholds(config) {
    const thresholds = { ...settings_1.DEFAULT_THRESHOLDS, ...config.thresholds };
    if (thresholds.co2ClearPpm >= thresholds.co2DetectPpm) {
        thresholds.co2ClearPpm = Math.round(thresholds.co2DetectPpm * 0.9);
    }
    return thresholds;
}
function formatReading(reading) {
    return [
        `Qingping reading for ${reading.name}:`,
        formatValue('T', reading.temperatureC, 'C'),
        formatValue('RH', reading.humidityPercent, '%'),
        formatValue('CO2', reading.co2Ppm, 'ppm'),
        formatValue('PM2.5', reading.pm25, 'ug/m3'),
        formatValue('PM10', reading.pm10, 'ug/m3'),
        formatValue('TVOC', reading.tvoc, ''),
        formatValue('Noise', reading.noiseDb, 'dB'),
        formatValue('Battery', reading.batteryPercent, '%'),
    ].filter(Boolean).join(' ');
}
function formatValue(label, value, unit) {
    return value === undefined ? '' : `${label}=${value}${unit}`;
}
