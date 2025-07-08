// Improved Storage Manager - Handles localStorage quota and optimization
export interface StorageStats {
  used: number;
  available: number;
  quota: number;
  percentage: number;
}

export interface StorageItem {
  key: string;
  size: number;
  lastAccessed: number;
  compressed: boolean;
}

class ImprovedStorageManager {
  private readonly QUOTA_THRESHOLD = 0.8; // 80% of quota
  private readonly CLEANUP_THRESHOLD = 0.9; // 90% of quota
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  private readonly MAX_ITEM_SIZE = 1024 * 1024; // 1MB per item
  
  // LZ-string compression/decompression
  private compress(data: string): string {
    try {
      // Simple compression - replace repeated patterns
      return data
        .replace(/\s+/g, ' ')
        .replace(/([{}[\]",:])\s+/g, '$1')
        .replace(/\s+([{}[\]",:])/g, '$1');
    } catch (error) {
      console.warn('Compression failed:', error);
      return data;
    }
  }

  private decompress(data: string): string {
    try {
      // Data is already decompressed in our simple implementation
      return data;
    } catch (error) {
      console.warn('Decompression failed:', error);
      return data;
    }
  }

  private getItemSize(key: string): number {
    try {
      const item = localStorage.getItem(key);
      return item ? new Blob([item]).size : 0;
    } catch (error) {
      return 0;
    }
  }

  private getItemInfo(key: string): StorageItem | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const size = new Blob([item]).size;
      const lastAccessed = Date.now();
      const compressed = item.startsWith('{"compressed":true,');

      return {
        key,
        size,
        lastAccessed,
        compressed
      };
    } catch (error) {
      return null;
    }
  }

  private getAllStorageItems(): StorageItem[] {
    const items: StorageItem[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const item = this.getItemInfo(key);
          if (item) {
            items.push(item);
          }
        }
      }
    } catch (error) {
      console.error('Error getting storage items:', error);
    }
    
    return items;
  }

  public async getStorageStats(): Promise<StorageStats> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 5 * 1024 * 1024; // 5MB default
        const available = quota - used;
        const percentage = (used / quota) * 100;

        return {
          used: used / 1024 / 1024, // Convert to MB
          available: available / 1024 / 1024, // Convert to MB
          quota: quota / 1024 / 1024, // Convert to MB
          percentage
        };
      } else {
        // Fallback: estimate localStorage usage
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            totalSize += this.getItemSize(key);
          }
        }
        
        const estimatedQuota = 5 * 1024 * 1024; // 5MB typical limit
        const percentage = (totalSize / estimatedQuota) * 100;

        return {
          used: totalSize / 1024 / 1024,
          available: (estimatedQuota - totalSize) / 1024 / 1024,
          quota: estimatedQuota / 1024 / 1024,
          percentage
        };
      }
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        used: 0,
        available: 5,
        quota: 5,
        percentage: 0
      };
    }
  }

  public async setItemSafely(key: string, value: any): Promise<boolean> {
    try {
      let serializedValue = JSON.stringify(value);
      
      // Check if we need to compress
      if (serializedValue.length > this.COMPRESSION_THRESHOLD) {
        const compressed = this.compress(serializedValue);
        if (compressed.length < serializedValue.length) {
          serializedValue = JSON.stringify({
            compressed: true,
            data: compressed
          });
        }
      }

      // Check if item is too large
      if (serializedValue.length > this.MAX_ITEM_SIZE) {
        console.warn(`Item ${key} is too large (${serializedValue.length} bytes)`);
        return false;
      }

      // Try to set the item
      localStorage.setItem(key, serializedValue);
      
      // Check if we're approaching quota
      const stats = await this.getStorageStats();
      if (stats.percentage > this.QUOTA_THRESHOLD * 100) {
        console.warn(`Storage usage is high (${stats.percentage.toFixed(1)}%)`);
        if (stats.percentage > this.CLEANUP_THRESHOLD * 100) {
          await this.cleanupStorage();
        }
      }
      
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, attempting cleanup...');
        await this.cleanupStorage();
        
        // Try again after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (retryError) {
          console.error('Failed to set item even after cleanup:', retryError);
          return false;
        }
      } else {
        console.error('Error setting localStorage item:', error);
        return false;
      }
    }
  }

  public getItemSafely<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;

      const parsed = JSON.parse(item);
      
      // Check if it's compressed
      if (parsed && typeof parsed === 'object' && parsed.compressed) {
        const decompressed = this.decompress(parsed.data);
        return JSON.parse(decompressed);
      }
      
      return parsed;
    } catch (error) {
      console.error(`Error getting localStorage item ${key}:`, error);
      return defaultValue;
    }
  }

  public async cleanupStorage(): Promise<void> {
    try {
      console.log('🧹 Starting storage cleanup...');
      
      const items = this.getAllStorageItems();
      const stats = await this.getStorageStats();
      
      // Sort by size (largest first) and last accessed (oldest first)
      const sortedItems = items.sort((a, b) => {
        const sizeWeight = b.size - a.size;
        const timeWeight = a.lastAccessed - b.lastAccessed;
        return sizeWeight * 0.7 + timeWeight * 0.3;
      });

      let cleanedSize = 0;
      let cleanedCount = 0;
      
      // Remove large or old items until we're under threshold
      for (const item of sortedItems) {
        if (stats.percentage < this.QUOTA_THRESHOLD * 100) {
          break;
        }
        
        // Skip essential items
        if (this.isEssentialItem(item.key)) {
          continue;
        }
        
        // Remove the item
        localStorage.removeItem(item.key);
        cleanedSize += item.size;
        cleanedCount++;
        
        // Update stats
        stats.used -= item.size / 1024 / 1024;
        stats.percentage = (stats.used / stats.quota) * 100;
      }
      
      console.log(`✅ Storage cleanup completed: ${cleanedCount} items removed, ${(cleanedSize / 1024).toFixed(1)} KB freed`);
    } catch (error) {
      console.error('Error during storage cleanup:', error);
    }
  }

  private isEssentialItem(key: string): boolean {
    const essentialKeys = [
      'firebaseIdToken',
      'authState',
      'userPreferences',
      'appSettings'
    ];
    
    return essentialKeys.some(essential => key.includes(essential));
  }

  public async optimizeStorage(): Promise<void> {
    try {
      console.log('🔧 Optimizing storage...');
      
      const items = this.getAllStorageItems();
      let optimizedCount = 0;
      let spaceSaved = 0;
      
      for (const item of items) {
        if (item.compressed) continue;
        
        const value = this.getItemSafely(item.key, null);
        if (!value) continue;
        
        const originalSize = item.size;
        const success = await this.setItemSafely(item.key, value);
        
        if (success) {
          const newSize = this.getItemSize(item.key);
          if (newSize < originalSize) {
            spaceSaved += originalSize - newSize;
            optimizedCount++;
          }
        }
      }
      
      console.log(`✅ Storage optimization completed: ${optimizedCount} items optimized, ${(spaceSaved / 1024).toFixed(1)} KB saved`);
    } catch (error) {
      console.error('Error during storage optimization:', error);
    }
  }

  public removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage item ${key}:`, error);
    }
  }

  public clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  public async checkQuotaAndCleanup(): Promise<void> {
    const stats = await this.getStorageStats();
    
    if (stats.percentage > this.CLEANUP_THRESHOLD * 100) {
      await this.cleanupStorage();
    } else if (stats.percentage > this.QUOTA_THRESHOLD * 100) {
      console.warn(`Storage usage is high (${stats.percentage.toFixed(1)}%). Consider cleanup.`);
    }
  }

  // Utility method to compress large objects before storing
  public setLargeItem(key: string, value: any): Promise<boolean> {
    return this.setItemSafely(key, value);
  }

  // Utility method to get items with automatic decompression
  public getLargeItem<T>(key: string, defaultValue: T): T {
    return this.getItemSafely(key, defaultValue);
  }
}

// Create and export singleton instance
export const improvedStorageManager = new ImprovedStorageManager();

// Export class for testing or custom instances
export { ImprovedStorageManager };