import util from "util";

enum LogLevel {
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    DEBUG = "DEBUG",
}

class Logger {
    private timestamp() {
        return new Date().toISOString();
    }

    private format(data: unknown) {
        if (typeof data === "string") {
            return data;
        }

        return util.inspect(data, {
            depth: null,
            colors: true,
        });
    }

    private write(
        level: LogLevel,
        message: string,
        data?: unknown
    ) {
        const prefix = `[${this.timestamp()}] [${level}]`;

        if (data === undefined) {
            console.log(`${prefix} ${message}`);
            return;
        }

        console.log(
            `${prefix} ${message}\n${this.format(data)}`
        );
    }

    info(message: string, data?: unknown) {
        this.write(LogLevel.INFO, message, data);
    }

    warn(message: string, data?: unknown) {
        this.write(LogLevel.WARN, message, data);
    }

    error(message: string, data?: unknown) {
        this.write(LogLevel.ERROR, message, data);
    }

    debug(message: string, data?: unknown) {
        if (process.env.NODE_ENV !== "production") {
            this.write(LogLevel.DEBUG, message, data);
        }
    }

    request(
        method: string,
        url: string,
        status: number,
        duration: number
    ) {
        this.info(
            `${method} ${url} ${status} (${duration}ms)`
        );
    }

    upload(fileName: string, size: number) {
        this.info(
            `Uploaded ${fileName} (${(
                size /
                1024 /
                1024
            ).toFixed(2)} MB)`
        );
    }

    cache(message: string) {
        this.debug(`CACHE :: ${message}`);
    }

    database(message: string) {
        this.debug(`DATABASE :: ${message}`);
    }
}

const logger = new Logger();

export default logger;