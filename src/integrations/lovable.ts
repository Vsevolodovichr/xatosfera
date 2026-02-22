// Minimal stub for lovable integration to avoid build-time missing module errors.
// Replace with real implementation when integrating with Lovable auth SDK.
export const lovable = {
  auth: {
    async signInWithOAuth(provider: string, options?: Record<string, any>) {
      // This stub mimics the real API shape: returns { error, data }
      try {
        // In a real implementation you'd call the SDK here.
        return { error: null, data: null };
      } catch (err: any) {
        return { error: { message: err?.message || 'Unknown error' }, data: null };
      }
    },
  },
};

export default lovable;
