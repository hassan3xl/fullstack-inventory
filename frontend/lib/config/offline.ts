/**
 * Global configuration to enable/disable offline-first features.
 * 
 * Set this to `true` to completely deactivate:
 * 1. Offline request interception (apiService.ts)
 * 2. Local IndexedDB caching and mocking (offlineInterceptor.ts)
 * 3. Background synchronization (syncService.ts)
 * 4. Offline banner/toast notifications and connection listeners (SyncContext.tsx)
 * 
 * Set this to `false` (default) to enable offline-first capabilities.
 */
export const DISABLE_OFFLINE = false;
