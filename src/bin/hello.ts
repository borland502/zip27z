export async function hello(): Promise<void> {
  // Using various log levels from the global logger
  logger.info("Hello world from info level!");
  logger.warn("This is a warning message");
  logger.error("This is an error message");
  logger.debug("This is a debug message (may not show with current log level)");
}
