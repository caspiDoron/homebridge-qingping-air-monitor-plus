import type { API, Logger } from 'homebridge';
import type { AlertState, QingpingReading } from '../types';
export declare class HistoryStore {
    private readonly log;
    private readonly retentionDays;
    private readonly filePath;
    constructor(log: Logger, api: API, retentionDays: number);
    append(reading: QingpingReading, alerts: AlertState): void;
    private pruneOccasionally;
}
