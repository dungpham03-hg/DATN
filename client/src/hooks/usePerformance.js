import { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} - Debounced value
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for throttling function calls
 * @param {Function} callback - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Throttled function
 */
export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
};

/**
 * Custom hook for memoizing expensive calculations
 * @param {Function} factory - Function that returns the value to memoize
 * @param {Array} deps - Dependencies array
 * @returns {any} - Memoized value
 */
export const useExpensiveValue = (factory, deps) => {
  return useMemo(() => {
    return factory();
  }, deps);
};

/**
 * Custom hook for virtual scrolling optimization
 * @param {Array} items - Array of items
 * @param {number} itemHeight - Height of each item
 * @param {number} containerHeight - Height of container
 * @returns {Object} - Virtual scrolling data
 */
export const useVirtualScrolling = (items, itemHeight, containerHeight) => {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
    const totalHeight = items.length * itemHeight;

    return {
      totalHeight,
      visibleCount,
      itemHeight,
      getVisibleRange: (scrollTop) => {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount, items.length);
        
        return {
          startIndex,
          endIndex,
          visibleItems: items.slice(startIndex, endIndex),
          offsetY: startIndex * itemHeight
        };
      }
    };
  }, [items, itemHeight, containerHeight]);
};

/**
 * Custom hook for intersection observer
 * @param {Object} options - Intersection observer options
 * @returns {Object} - { ref, isIntersecting }
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return { ref, isIntersecting };
};

/**
 * Custom hook for lazy loading
 * @param {Function} loadFunction - Function to load data
 * @param {Array} deps - Dependencies
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useLazyLoad = (loadFunction, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await loadFunction();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [loadFunction]);

  useEffect(() => {
    load();
  }, deps);

  return { data, loading, error, refetch: load };
};

/**
 * Custom hook for window size
 * @returns {Object} - { width, height }
 */
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

/**
 * Custom hook for local storage with JSON parsing
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value
 * @returns {Array} - [value, setValue]
 */
export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [value, setStoredValue];
};

/**
 * Custom hook for session storage with JSON parsing
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value
 * @returns {Array} - [value, setValue]
 */
export const useSessionStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      window.sessionStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key]);

  return [value, setStoredValue];
};

export default {
  useDebounce,
  useThrottle,
  useExpensiveValue,
  useVirtualScrolling,
  useIntersectionObserver,
  useLazyLoad,
  useWindowSize,
  useLocalStorage,
  useSessionStorage
};
