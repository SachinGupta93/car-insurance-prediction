// Utility to reset quota tracking (for development/testing)
import { QuotaManager } from './quota-manager';

export const resetQuotaTracking = () => {
  QuotaManager.resetCount();
  console.log('✅ Quota tracking reset. You can now make new requests.');
};

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).resetQuota = resetQuotaTracking;
  console.log('💡 Tip: Type "resetQuota()" in console to reset quota tracking');
}