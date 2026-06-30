import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import { MonitorAccessoryGroup } from './accessories/monitorAccessoryGroup';
import { QingpingCloudClient } from './clients/qingpingCloudClient';
import { HistoryStore } from './history/historyStore';
import {
  DEFAULT_POLL_INTERVAL_SECONDS,
  DEFAULT_THRESHOLDS,
  MIN_POLL_INTERVAL_SECONDS,
  PLATFORM_NAME,
  PLUGIN_NAME,
} from './settings';
import type { AlertThresholds, QingpingPlatformConfig, QingpingReading } from './types';
import { RuleEngine } from './rules/ruleEngine';

export class QingpingAirMonitorPlusPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  private readonly accessories = new Map<string, PlatformAccessory>();
  private readonly config: QingpingPlatformConfig;
  private readonly client: QingpingCloudClient;
  private readonly rules: RuleEngine;
  private readonly history?: HistoryStore;
  private monitorAccessories?: MonitorAccessoryGroup;
  private pollTimer?: NodeJS.Timeout;

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.config = config as QingpingPlatformConfig;
    this.client = new QingpingCloudClient(log, this.config);
    this.rules = new RuleEngine(resolveThresholds(this.config));

    if (this.config.enableHistory !== false) {
      this.history = new HistoryStore(log, api, Number(this.config.historyRetentionDays ?? 30));
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

  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.set(accessory.UUID, accessory);
  }

  private start(): void {
    const pollSeconds = Math.max(
      MIN_POLL_INTERVAL_SECONDS,
      Number(this.config.pollIntervalSeconds ?? DEFAULT_POLL_INTERVAL_SECONDS),
    );

    this.pollOnce();
    this.pollTimer = setInterval(() => this.pollOnce(), pollSeconds * 1000);
    this.log.info(`Qingping Air Monitor Plus polling every ${pollSeconds} seconds`);
  }

  private async pollOnce(): Promise<void> {
    try {
      const reading = await this.client.fetchReading();
      this.unregisterLegacyAccessory(reading);
      this.unregisterObsoleteAccessories(reading);

      if (!this.monitorAccessories) {
        this.monitorAccessories = new MonitorAccessoryGroup(
          this.log,
          this.api,
          (key, name) => this.getOrCreateAccessory(reading, key, name),
          this.config.exposeNoiseAsLightSensor !== false,
          this.config.exposeMetricTilesAsLightSensors === true,
        );
      }

      const alerts = this.rules.evaluate(reading);
      this.monitorAccessories.update(reading, alerts);
      this.history?.append(reading, alerts);

      this.log.debug(formatReading(reading));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.warn(`Qingping cloud polling failed: ${message}`);
    }
  }

  private getOrCreateAccessory(reading: QingpingReading, key: string, name: string): PlatformAccessory {
    const uuid = this.api.hap.uuid.generate(`${PLATFORM_NAME}:${reading.id}:${key}`);
    const cached = this.accessories.get(uuid);
    if (cached) {
      return cached;
    }

    const accessory = new this.api.platformAccessory(name, uuid);
    accessory.context.deviceId = reading.id;
    accessory.context.serviceKey = key;
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    this.accessories.set(uuid, accessory);
    this.log.info(`Registered Qingping accessory: ${name} (${reading.id}/${key})`);
    return accessory;
  }

  private unregisterLegacyAccessory(reading: QingpingReading): void {
    const legacyUuid = this.api.hap.uuid.generate(`${PLATFORM_NAME}:${reading.id}`);
    const legacy = this.accessories.get(legacyUuid);
    if (!legacy) {
      return;
    }

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [legacy]);
    this.accessories.delete(legacyUuid);
    this.log.info(`Removed legacy bundled Qingping accessory: ${reading.name}`);
  }

  private unregisterObsoleteAccessories(reading: QingpingReading): void {
    const obsoleteKeys = [
      'battery',
      'ventilationNeeded',
      'airPurifierRecommended',
      'humidifierRecommended',
      'dehumidifierRecommended',
      'quietModeRecommended',
      'cloudStale',
    ];

    if (this.config.exposeNoiseAsLightSensor === false) {
      obsoleteKeys.push('noise');
    }

    if (this.config.exposeMetricTilesAsLightSensors !== true) {
      obsoleteKeys.push('co2Tile', 'pm25Tile', 'pm10Tile', 'tvocTile');
    }

    const accessoriesToRemove = obsoleteKeys
      .map(key => this.api.hap.uuid.generate(`${PLATFORM_NAME}:${reading.id}:${key}`))
      .map(uuid => this.accessories.get(uuid))
      .filter((accessory): accessory is PlatformAccessory => accessory !== undefined);

    if (accessoriesToRemove.length === 0) {
      return;
    }

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRemove);
    for (const accessory of accessoriesToRemove) {
      this.accessories.delete(accessory.UUID);
      this.log.info(`Removed obsolete Qingping accessory: ${accessory.displayName}`);
    }
  }
}

function resolveThresholds(config: QingpingPlatformConfig): AlertThresholds {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds };

  if (thresholds.co2ClearPpm >= thresholds.co2DetectPpm) {
    thresholds.co2ClearPpm = Math.round(thresholds.co2DetectPpm * 0.9);
  }

  return thresholds;
}

function formatReading(reading: QingpingReading): string {
  return [
    `Qingping reading for ${reading.name}:`,
    formatValue('T', reading.temperatureC, 'C'),
    formatValue('RH', reading.humidityPercent, '%'),
    formatValue('CO2', reading.co2Ppm, 'ppm'),
    formatValue('PM2.5', reading.pm25, 'ug/m3'),
    formatValue('PM10', reading.pm10, 'ug/m3'),
    formatValue('TVOC', reading.tvoc, ''),
    formatValue('Noise', reading.noiseDb, 'dB'),
  ].filter(Boolean).join(' ');
}

function formatValue(label: string, value: number | undefined, unit: string): string {
  return value === undefined ? '' : `${label}=${value}${unit}`;
}
