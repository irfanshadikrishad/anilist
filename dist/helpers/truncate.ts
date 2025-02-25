import cliTruncate from "cli-truncate"

/**
 * Truncate text (No line break)
 * @param str - Long text to trancate
 */
function responsiveOutput(str: string) {
  console.log(cliTruncate(str, process.stdout.columns - 5))
}

export { responsiveOutput }
