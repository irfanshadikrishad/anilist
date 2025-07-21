import chalk from 'chalk'

class colorize {
  static Green(txt: string): string {
    return String(chalk.green(String(txt)))
  }
  static Red(txt: string): string {
    return String(chalk.red(String(txt)))
  }
  static Yellow(txt: string): string {
    return String(chalk.yellow(String(txt)))
  }
  static BgGreen(txt: string): string {
    return String(chalk.bgGreen(String(txt)))
  }
  static BgRed(txt: string): string {
    return String(chalk.bgRed(txt))
  }
}

export { colorize }
