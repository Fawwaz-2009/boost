import * as fs from "node:fs";
import * as path from "node:path";

export interface LogEntry {
  timestamp: string;
  type: "console" | "error" | "unhandledrejection";
  level?: "log" | "info" | "warn" | "error" | "debug";
  message: string;
  args?: string[];
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}

export interface LogWriterOptions {
  logDir: string;
  maxFileSize?: number; // bytes, default 5MB
}

export class LogWriter {
  private logDir: string;
  private maxFileSize: number;

  constructor(options: LogWriterOptions) {
    this.logDir = options.logDir;
    this.maxFileSize = options.maxFileSize ?? 5 * 1024 * 1024; // 5MB default
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.ensureGitignore();
  }

  private ensureGitignore(): void {
    // Find the closest .gitignore or create one in logDir parent
    const parentDir = path.dirname(this.logDir);
    const gitignorePath = path.join(parentDir, ".gitignore");
    const logDirName = path.basename(this.logDir);

    try {
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, "utf-8");
        if (!content.includes(logDirName)) {
          fs.appendFileSync(gitignorePath, `\n# MCP Boost logs\n${logDirName}/\n`);
        }
      } else {
        fs.writeFileSync(gitignorePath, `# MCP Boost logs\n${logDirName}/\n`);
      }
    } catch {
      // Ignore gitignore errors - not critical
    }
  }

  private getLogPath(type: "browser" | "server"): string {
    return path.join(this.logDir, `${type}.log`);
  }

  private rotateIfNeeded(logPath: string): void {
    try {
      if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        if (stats.size > this.maxFileSize) {
          // Simple rotation: just truncate the file
          // Keep last 1000 lines
          const content = fs.readFileSync(logPath, "utf-8");
          const lines = content.trim().split("\n");
          const keepLines = lines.slice(-1000);
          fs.writeFileSync(logPath, keepLines.join("\n") + "\n");
        }
      }
    } catch {
      // Ignore rotation errors
    }
  }

  write(type: "browser" | "server", entry: LogEntry): void {
    const logPath = this.getLogPath(type);
    this.rotateIfNeeded(logPath);

    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(logPath, line);
  }

  read(type: "browser" | "server", count: number = 20): LogEntry[] {
    const logPath = this.getLogPath(type);

    if (!fs.existsSync(logPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      const lastLines = lines.slice(-count);

      return lastLines
        .map((line) => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is LogEntry => entry !== null)
        .reverse(); // Newest first
    } catch {
      return [];
    }
  }

  clear(type: "browser" | "server"): void {
    const logPath = this.getLogPath(type);
    if (fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, "");
    }
  }
}

// Singleton for use across the plugin
let writerInstance: LogWriter | null = null;

export function getLogWriter(logDir: string): LogWriter {
  if (!writerInstance || writerInstance["logDir"] !== logDir) {
    writerInstance = new LogWriter({ logDir });
  }
  return writerInstance;
}

export function readLogs(
  logDir: string,
  type: "browser" | "server",
  count: number = 20
): LogEntry[] {
  const logPath = path.join(logDir, `${type}.log`);

  if (!fs.existsSync(logPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const lastLines = lines.slice(-count);

    return lastLines
      .map((line) => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null)
      .reverse(); // Newest first
  } catch {
    return [];
  }
}
