"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngine = void 0;
class RuleEngine {
    thresholds;
    co2High = false;
    constructor(thresholds) {
        this.thresholds = thresholds;
    }
    evaluate(reading) {
        this.updateCo2Hysteresis(reading.co2Ppm);
        const humidityLow = isBelow(reading.humidityPercent, this.thresholds.humidityLow);
        const humidityHigh = isAbove(reading.humidityPercent, this.thresholds.humidityHigh);
        const temperatureLow = isBelow(reading.temperatureC, this.thresholds.temperatureLow);
        const temperatureHigh = isAbove(reading.temperatureC, this.thresholds.temperatureHigh);
        const pm25High = isAbove(reading.pm25, this.thresholds.pm25Poor);
        const pm10High = isAbove(reading.pm10, this.thresholds.pm10Poor);
        const vocHigh = isAbove(reading.tvoc, this.thresholds.tvocPoor);
        const noiseHigh = isAbove(reading.noiseDb, this.thresholds.noiseHighDb);
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
            stale,
            ventilationNeeded: this.co2High || vocHigh || humidityHigh,
            airPurifierRecommended: particulateHigh || vocHigh,
            humidifierRecommended: humidityLow,
            dehumidifierRecommended: humidityHigh,
            quietModeRecommended: noiseHigh,
        };
    }
    updateCo2Hysteresis(co2Ppm) {
        if (co2Ppm === undefined) {
            return;
        }
        if (!this.co2High && co2Ppm >= this.thresholds.co2DetectPpm) {
            this.co2High = true;
        }
        else if (this.co2High && co2Ppm <= this.thresholds.co2ClearPpm) {
            this.co2High = false;
        }
    }
}
exports.RuleEngine = RuleEngine;
function isAbove(value, threshold) {
    return value !== undefined && value > threshold;
}
function isBelow(value, threshold) {
    return value !== undefined && value < threshold;
}
function isStale(timestamp, staleAfterMinutes) {
    const ageMs = Date.now() - Date.parse(timestamp);
    return Number.isFinite(ageMs) && ageMs > staleAfterMinutes * 60_000;
}
