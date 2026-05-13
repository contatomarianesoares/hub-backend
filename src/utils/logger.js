function createLogger(context) {
  return {
    info(message, data = {}) {
      console.info(
        `[${context}] ${message}`,
        {
          ...data,
          timestamp: new Date().toISOString(),
        }
      );
    },

    warn(message, data = {}) {
      console.warn(
        `[${context}] ${message}`,
        {
          ...data,
          timestamp: new Date().toISOString(),
        }
      );
    },

    error(message, error, data = {}) {
      console.error(
        `[${context}] ${message}`,
        {
          ...data,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
        }
      );
    },
  };
}

module.exports = { createLogger };
