import type { Logger } from 'homebridge';
import { DEFAULT_DEVICES_URL, DEFAULT_TOKEN_URL } from '../settings';
import type { OAuthToken, QingpingPlatformConfig, QingpingReading } from '../types';

interface CloudDevice {
  id: string;
  name: string;
  data: Record<string, unknown>;
  raw: unknown;
}

export class QingpingCloudClient {
  private token?: OAuthToken;

  constructor(
    private readonly log: Logger,
    private readonly config: QingpingPlatformConfig,
  ) {}

  async fetchReading(): Promise<QingpingReading> {
    const devices = await this.fetchDevices();
    if (devices.length === 0) {
      throw new Error('Qingping cloud returned no devices');
    }

    const selected = this.selectDevice(devices);
    if (!selected) {
      const available = devices.map(device => `${device.name} (${device.id})`).join(', ');
      throw new Error(`Configured Qingping device was not found. Available devices: ${available}`);
    }

    return {
      id: selected.id,
      name: selected.name,
      timestamp: new Date().toISOString(),
      temperatureC: readMetric(selected.data, ['temperature', 'temperature_c', 'temp']),
      humidityPercent: readMetric(selected.data, ['humidity', 'relative_humidity']),
      co2Ppm: readMetric(selected.data, ['co2', 'co2_ppm', 'carbon_dioxide']),
      pm25: readMetric(selected.data, ['pm25', 'pm2_5', 'pm2.5']),
      pm10: readMetric(selected.data, ['pm10']),
      tvoc: readMetric(selected.data, ['tvoc', 'tvoc_index', 'voc', 'voc_index']),
      noiseDb: readMetric(selected.data, ['noise', 'noise_db', 'sound', 'sound_level']),
      batteryPercent: readMetric(selected.data, ['battery', 'battery_level', 'batteryPercent']),
      charging: readBooleanMetric(selected.data, ['charging', 'is_charging']),
      online: readOnline(selected.raw),
      raw: selected.raw,
    };
  }

  private async fetchDevices(): Promise<CloudDevice[]> {
    const token = await this.getAccessToken();
    const devicesUrl = this.config.devicesUrl || DEFAULT_DEVICES_URL;
    const response = await fetch(devicesUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const payload = await parseJsonResponse(response, 'Qingping devices request');
    const devices = normalizeDevices(payload);

    this.log.debug(`Qingping cloud returned ${devices.length} device(s)`);
    this.log.debug(`Qingping raw devices payload: ${JSON.stringify(payload)}`);

    return devices;
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 30_000) {
      return this.token.accessToken;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Qingping cloud clientId and clientSecret are required');
    }

    const tokenUrl = this.config.tokenUrl || DEFAULT_TOKEN_URL;
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: this.config.scope || 'device_full_access',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });

    const payload = await parseJsonResponse(response, 'Qingping token request');
    const accessToken = readString(payload, ['access_token', 'accessToken', 'token']);
    const expiresIn = readNumber(payload, ['expires_in', 'expiresIn']) ?? 3600;

    if (!accessToken) {
      throw new Error(`Qingping token response did not include an access token: ${JSON.stringify(payload)}`);
    }

    this.token = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    this.log.debug(`Fetched Qingping cloud token, expires in ${expiresIn} seconds`);
    return accessToken;
  }

  private selectDevice(devices: CloudDevice[]): CloudDevice | undefined {
    if (this.config.deviceId) {
      return devices.find(device => device.id === this.config.deviceId);
    }

    if (this.config.deviceName) {
      const expected = this.config.deviceName.toLowerCase();
      return devices.find(device => device.name.toLowerCase() === expected)
        ?? devices.find(device => device.name.toLowerCase().includes(expected));
    }

    return devices[0];
  }
}

async function parseJsonResponse(response: Response, label: string): Promise<unknown> {
  const text = await response.text();
  let payload: unknown;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${label} returned non-JSON response (${response.status}): ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
}

function normalizeDevices(payload: unknown): CloudDevice[] {
  const root = asRecord(payload);
  const candidates = [
    root.devices,
    root.data,
    asRecord(root.data).devices,
    asRecord(root.result).devices,
    root.result,
  ];

  const list = candidates.find(Array.isArray) as unknown[] | undefined;
  if (!list) {
    return [];
  }

  return list.map((raw, index) => {
    const device = asRecord(raw);
    const info = asRecord(device.info);
    const data = asRecord(device.data ?? device.metrics ?? device.properties ?? device);
    const id = readString(device, ['id', 'device_id', 'deviceId', 'mac'])
      ?? readString(info, ['mac', 'did', 'id', 'device_id'])
      ?? String(index + 1);
    const name = readString(device, ['name', 'device_name', 'deviceName'])
      ?? readString(info, ['name', 'device_name'])
      ?? `Qingping ${id}`;

    return { id, name, data, raw };
  });
}

function readMetric(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    const number = valueToNumber(value);
    if (number !== undefined) {
      return number;
    }
  }
  return undefined;
}

function readBooleanMetric(record: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
    const nested = asRecord(value).value;
    if (typeof nested === 'boolean') {
      return nested;
    }
  }
  return undefined;
}

function readOnline(raw: unknown): boolean {
  const record = asRecord(raw);
  const info = asRecord(record.info);
  const status = readString(record, ['status', 'online']) ?? readString(info, ['status', 'online']);
  if (!status) {
    return true;
  }
  return !['offline', 'false', '0'].includes(status.toLowerCase());
}

function valueToNumber(value: unknown): number | undefined {
  const direct = Number(value);
  if (Number.isFinite(direct)) {
    return direct;
  }

  const nested = Number(asRecord(value).value);
  return Number.isFinite(nested) ? nested : undefined;
}

function readString(payload: unknown, keys: string[]): string | undefined {
  const record = asRecord(payload);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return undefined;
}

function readNumber(payload: unknown, keys: string[]): number | undefined {
  const record = asRecord(payload);
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}
