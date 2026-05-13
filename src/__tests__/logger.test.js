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

  it('should have warn method that includes context and timestamp', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const logger = createLogger('WARN_TEST');
    logger.warn('Warning message', { code: 'WARN_001' });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARN_TEST'),
      expect.objectContaining({
        code: 'WARN_001',
        timestamp: expect.any(String),
      })
    );
    warnSpy.mockRestore();
  });

  it('should have error method that includes context and timestamp', () => {
    const errorSpy = vi.spyOn(console, 'error');
    const logger = createLogger('ERROR_TEST');
    const testError = new Error('Test error');
    logger.error('Error occurred', testError, { errorCode: 'ERR_001' });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERROR_TEST'),
      expect.objectContaining({
        error: 'Test error',
        errorCode: 'ERR_001',
        timestamp: expect.any(String),
      })
    );
    errorSpy.mockRestore();
  });

  it('should handle non-Error objects in error method', () => {
    const errorSpy = vi.spyOn(console, 'error');
    const logger = createLogger('ERROR_PLAIN');
    logger.error('Error occurred', 'Plain string error', { context: 'test' });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERROR_PLAIN'),
      expect.objectContaining({
        error: 'Plain string error',
        context: 'test',
      })
    );
    errorSpy.mockRestore();
  });
});
