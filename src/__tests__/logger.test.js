import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../utils/logger.js';

describe('Logger utility', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create logger with correlation ID', () => {
    const logger = createLogger('TEST_CONTEXT');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('should include context in log messages', () => {
    const logger = createLogger('WEBHOOK');
    const correlationId = 'corr_123';
    logger.info('Test message', { correlationId });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WEBHOOK'),
      expect.objectContaining({ correlationId })
    );
  });

  it('should include timestamp in every log', () => {
    const logger = createLogger('API');
    logger.info('Test event', { event: 'test' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );
  });
});
