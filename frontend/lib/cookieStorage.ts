// Cookie storage implementation for Zustand persist middleware
// Compatible with Zustand's StateStorage interface

interface CookieStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

// Helper function to get cookie value
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length);
      // Decode URI component if it was encoded
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
};

// Helper function to set cookie
const setCookie = (name: string, value: string, days: number = 7): void => {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  // Encode value to handle special characters
  const encodedValue = encodeURIComponent(value);
  document.cookie = `${name}=${encodedValue};expires=${expires.toUTCString()};path=/`;
};

// Helper function to delete cookie
const deleteCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

// Cookie storage implementation for Zustand
export const cookieStorage: CookieStorage = {
  getItem: (name: string): string | null => {
    return getCookie(name);
  },
  setItem: (name: string, value: string): void => {
    // Note: Cookies have a 4KB limit per cookie
    // For large values, consider splitting or using a different approach
    if (value.length > 4000) {
      console.warn(`Cookie value for ${name} exceeds 4KB limit. Consider using a different storage method.`);
    }
    setCookie(name, value, 7); // 7 days expiration
  },
  removeItem: (name: string): void => {
    deleteCookie(name);
  },
};

// Export helper functions for use in other files
export { getCookie, setCookie, deleteCookie };

