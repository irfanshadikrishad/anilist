import chalk from "chalk";

function colorize_Error(text: string) {
  console.log(chalk.red(text));
}
function colorize_Anilist(text: string) {
  console.log(chalk.hex("#03a8fc")(text));
}
function colorize_Normal(text: string) {
  console.log(chalk.hex("#ce9c69")(text));
}
function colorize_Hex(text: string, hex: string) {
  console.log(chalk.hex(hex)(text));
}

export { colorize_Error, colorize_Anilist, colorize_Normal, colorize_Hex };
