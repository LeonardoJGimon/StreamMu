/**
 * Logger Module
 * Centralized error logging for production environments
 */

const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

class Logger {
    constructor(enableConsole = false) {
        this.enableConsole = enableConsole || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');
        this.logs = [];
        this.maxLogs = 100;
    }

    log(level, message, data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        if (this.enableConsole) {
        }

        // Optionally send to remote logging service
        if (level === LogLevel.ERROR) {
            this._sendToRemote(logEntry);
        }
    }

    debug(message, data = null) { this.log(LogLevel.DEBUG, message, data); }
    info(message, data = null) { this.log(LogLevel.INFO, message, data); }
    warn(message, data = null) { this.log(LogLevel.WARN, message, data); }
    error(message, data = null) { this.log(LogLevel.ERROR, message, data); }

    getLogs() { return [...this.logs]; }
    clearLogs() { this.logs = []; }

    _getConsoleStyle(level) {
        const styles = {
            DEBUG: 'color: #999;',
            INFO: 'color: #0066cc;',
            WARN: 'color: #ff9900;',
            ERROR: 'color: #cc0000; font-weight: bold;'
        };
        return styles[level] || '';
    }

    _sendToRemote(logEntry) {
        // Implement remote logging endpoint if needed
        // Example: fetch('/api/logs', { method: 'POST', body: JSON.stringify(logEntry) })
    }
}

// Create global logger instance
window.AppLogger = new Logger();

// Export
window.LoggerModule = { Logger, LogLevel };
