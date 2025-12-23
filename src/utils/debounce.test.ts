import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce';

describe('debounce utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delay function execution by specified delay', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn('test');
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous timeout when called multiple times', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn('first');
    vi.advanceTimersByTime(100);
    
    debouncedFn('second');
    vi.advanceTimersByTime(100);
    
    debouncedFn('third');
    vi.advanceTimersByTime(300);

    // Only the last call should execute
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('third');
  });

  it('should pass all arguments to the debounced function', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn('arg1', 'arg2', 'arg3');
    vi.advanceTimersByTime(300);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should preserve this context', () => {
    const obj = {
      value: 42,
      method: function (this: any) {
        return this.value;
      },
    };

    debounce(obj.method, 300);
    const result = vi.fn();

    obj.method = function (this: any) {
      result(this.value);
    };

    const debouncedObjMethod = debounce(obj.method.bind(obj), 300);
    debouncedObjMethod();
    vi.advanceTimersByTime(300);

    expect(result).toHaveBeenCalledWith(42);
  });
});
