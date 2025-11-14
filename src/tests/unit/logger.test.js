/**
 * Logger Tests
 */

import logger from '../../utils/logger.js';

describe('Logger', () => {
  it('should have required log methods', () => {
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.http).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should have context helpers', () => {
    expect(typeof logger.withUser).toBe('function');
    expect(typeof logger.withContext).toBe('function');
  });

  it('should log without throwing errors', () => {
    expect(() => {
      logger.info('Test info message');
      logger.error('Test error message');
      logger.debug('Test debug message');
    }).not.toThrow();
  });

  it('should handle withUser context', () => {
    expect(() => {
      const userLogger = logger.withUser({ id: 123, username: 'test' });
      userLogger.info('User context test');
    }).not.toThrow();
  });

  it('should handle withContext', () => {
    expect(() => {
      const contextLogger = logger.withContext({ action: 'test', module: 'unit-test' });
      contextLogger.info('Context test');
    }).not.toThrow();
  });
});
