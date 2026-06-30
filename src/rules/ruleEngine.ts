import type { AlertState, AlertThresholds, QingpingReading } from '../types';

export class RuleEngine {
  private co2High = false;

  constructor(private readonly thresholds: AlertThresholds) {}

  evaluate(reading: QingpingReading): AlertState {
    this.updateCo2Hysteresis(reading.co2Ppm);

    const humidityLow = isBelow(reading.humidityPercent, this.thresholds.humidityLow);
    const humidityHigh = isAbove(reading.humidityPercent, this.thresholds.humidityHigh);
    const temperatureLow = isBelow(reading.temperatureC, this.thresholds.temperatureLow);
    const temperatureHigh = isAbove(reading.temperatureC, this.thresholds.temperatureHigh);
    const pm25High = isAbove(reading.pm25, this.thresholds.pm25Poor);
    const pm10High = isAbove(reading.pm10, this.thresholds.pm10Poor);
    const vocHigh = isAbove(reading.tvoc, this.thresholds.tvocPoor);
    const noiseHigh = isAbove(reading.noiseDb, this.thresholds.noiseHighDb);
    const lowBattery = isBelow(reading.batteryPercent, this.thresholds.lowBatteryPercent);
    const stale = isStale(reading.timestamp, this.thresholds.staleAfterMinutes) || !reading.online;

    const particulateHigh = pm25High || pm10High;

    return {
      co2High: this.co2High,
      particulateHigh,
      vocHigh,
      humidityLow,
      humidityHigh,
      temperatureLow,
      temperatureHigh,
      noiseHigh,
      lowBattery,
      stale,
      ventilationNeeded: this.co2High || vocHigh || humidityHigh,
      airPurifierRecommended: particulateHigh || vocHigh,
      humidifierRecommended: humidityLow,
      dehumidifierRecommended: humidityHigh,
      quietModeRecommended: noiseHigh,
    };
  }

  private updateCo2Hysteresis(co2Ppm: number | undefined): void {
    if (co2Ppm === undefined) {
      return;
    }

    if (!this.co2High && co2Ppm >= this.thresholds.co2DetectPpm) {
      this.co2High = true;
    } else if (this.co2High && co2Ppm <= this.thresholds.co2ClearPpm) {
      this.co2High = false;
    }
  }
}

function isAbove(value: number | undefined, threshold: number): boolean {
  return value !== undefined && value > threshold;
}

function isBelow(value: number | undefined, threshold: number): boolean {
  return value !== undefined && value < threshold;
}

function isStale(timestamp: string, staleAfterMinutes: number): boolean {
  const ageMs = Date.now() - Date.parse(timestamp);
  return Number.isFinite(ageMs) && ageMs > staleAfterMinutes * 60_000;
}
