// src/setupTests.js
// Polyfill window.matchMedia for Jest/JSDOM.
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // For legacy support
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  
  // Optionally, add any other global mocks or setup code here.
  import '@testing-library/jest-dom';
  globalThis.importMeta = {
    env: {
      VITE_OPENWEATHERMAP_API_KEY: process.env.VITE_OPENWEATHERMAP_API_KEY || 'dummy-key',
    },
  };
  process.env.VITE_OPENWEATHERMAP_API_KEY = 'dummy-api-key';
