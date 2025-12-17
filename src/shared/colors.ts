/**
 * ANSI color codes for CLI output
 */
export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

export const c = {
  heading: (text: string) => `${colors.bold}${colors.cyan}${text}${colors.reset}`,
  success: (text: string) => `${colors.green}${text}${colors.reset}`,
  warn: (text: string) => `${colors.yellow}${text}${colors.reset}`,
  code: (text: string) => `${colors.dim}${text}${colors.reset}`,
  label: (text: string) => `${colors.bold}${text}${colors.reset}`,
  dim: (text: string) => `${colors.dim}${text}${colors.reset}`,
};
