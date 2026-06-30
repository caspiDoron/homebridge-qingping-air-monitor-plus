"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class HistoryStore {
    log;
    retentionDays;
    filePath;
    constructor(log, api, retentionDays) {
        this.log = log;
        this.retentionDays = retentionDays;
        const dirPath = node_path_1.default.join(api.user.storagePath(), 'qingping-air-monitor-plus');
        node_fs_1.default.mkdirSync(dirPath, { recursive: true });
        this.filePath = node_path_1.default.join(dirPath, 'history.jsonl');
    }
    append(reading, alerts) {
        const record = {
            reading: { ...reading, raw: undefined },
            alerts,
        };
        node_fs_1.default.appendFile(this.filePath, `${JSON.stringify(record)}\n`, err => {
            if (err) {
                this.log.warn(`Failed to write Qingping history: ${err.message}`);
            }
        });
        this.pruneOccasionally();
    }
    pruneOccasionally() {
        if (this.retentionDays <= 0) {
            return;
        }
        const now = new Date();
        if (now.getMinutes() !== 0) {
            return;
        }
        node_fs_1.default.readFile(this.filePath, 'utf8', (readErr, content) => {
            if (readErr) {
                return;
            }
            const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
            const kept = content
                .split('\n')
                .filter(line => {
                if (!line.trim()) {
                    return false;
                }
                try {
                    const parsed = JSON.parse(line);
                    return Date.parse(parsed.reading.timestamp) >= cutoff;
                }
                catch {
                    return false;
                }
            });
            node_fs_1.default.writeFile(this.filePath, `${kept.join('\n')}\n`, writeErr => {
                if (writeErr) {
                    this.log.warn(`Failed to prune Qingping history: ${writeErr.message}`);
                }
            });
        });
    }
}
exports.HistoryStore = HistoryStore;
