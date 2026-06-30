import type { AlertState, AlertThresholds, QingpingReading } from '../types';
export declare class RuleEngine {
    private readonly thresholds;
    private co2High;
    constructor(thresholds: AlertThresholds);
    evaluate(reading: QingpingReading): AlertState;
    private updateCo2Hysteresis;
}
