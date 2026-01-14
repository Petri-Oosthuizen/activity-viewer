import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Enhance File API mock to include text() and arrayBuffer() methods
// jsdom's File doesn't have these methods, so we add them via prototype
if (typeof File !== 'undefined' && typeof Blob !== 'undefined') {
  const OriginalFile = global.File;
  
  // Add text() method to File prototype
  if (!File.prototype.text) {
    File.prototype.text = async function (): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file as text'));
          }
        };
        reader.onerror = () => reject(reader.error || new Error('File read error'));
        reader.readAsText(this);
      });
    };
  }

  // Add arrayBuffer() method to File prototype
  if (!File.prototype.arrayBuffer) {
    File.prototype.arrayBuffer = async function (): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file as array buffer'));
          }
        };
        reader.onerror = () => reject(reader.error || new Error('File read error'));
        reader.readAsArrayBuffer(this);
      });
    };
  }
}


