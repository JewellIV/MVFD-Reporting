// Offline Database Management using IndexedDB
export interface OfflineRecord {
  id: string;
  type: 'nemsis' | 'nfirs';
  data: any;
  timestamp: number;
  synced: boolean;
  token: string;
}

export interface OfflineConfig {
  lookupTables: any;
  userData: any;
  lastSync: number;
}

class OfflineDB {
  private dbName = 'MangohickOfflineDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('offlineRecords')) {
          const recordsStore = db.createObjectStore('offlineRecords', { keyPath: 'id' });
          recordsStore.createIndex('type', 'type', { unique: false });
          recordsStore.createIndex('synced', 'synced', { unique: false });
          recordsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('lookupTables')) {
          db.createObjectStore('lookupTables', { keyPath: 'name' });
        }

        if (!db.objectStoreNames.contains('userData')) {
          db.createObjectStore('userData', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('priority', 'priority', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Offline Records Management
  async saveOfflineRecord(record: OfflineRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readwrite');
      const store = transaction.objectStore('offlineRecords');
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineRecords(type?: 'nemsis' | 'nfirs'): Promise<OfflineRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readonly');
      const store = transaction.objectStore('offlineRecords');
      const request = store.getAll();

      request.onsuccess = () => {
        let records = request.result;
        if (type) {
          records = records.filter(record => record.type === type);
        }
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedRecords(): Promise<OfflineRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readonly');
      const store = transaction.objectStore('offlineRecords');
      const request = store.getAll();

      request.onsuccess = () => {
        const all: OfflineRecord[] = request.result || [];
        resolve(all.filter(r => !r.synced));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markRecordAsSynced(recordId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readwrite');
      const store = transaction.objectStore('offlineRecords');
      const getRequest = store.get(recordId);

      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = true;
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Record not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteOfflineRecord(recordId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineRecords'], 'readwrite');
      const store = transaction.objectStore('offlineRecords');
      const request = store.delete(recordId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Lookup Tables Management
  async saveLookupTable(name: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['lookupTables'], 'readwrite');
      const store = transaction.objectStore('lookupTables');
      const request = store.put({ name, data, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLookupTable(name: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['lookupTables'], 'readonly');
      const store = transaction.objectStore('lookupTables');
      const request = store.get(name);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // User Data Management
  async saveUserData(key: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userData'], 'readwrite');
      const store = transaction.objectStore('userData');
      const request = store.put({ key, data, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserData(key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userData'], 'readonly');
      const store = transaction.objectStore('userData');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Queue Management
  async addToSyncQueue(action: string, data: any, priority: number = 1): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add({
        action,
        data,
        priority,
        timestamp: Date.now(),
        attempts: 0
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('priority');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromSyncQueue(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Database Management
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['offlineRecords', 'lookupTables', 'userData', 'syncQueue'],
        'readwrite'
      );

      let completed = 0;
      const total = 4;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      transaction.objectStore('offlineRecords').clear().onsuccess = checkComplete;
      transaction.objectStore('lookupTables').clear().onsuccess = checkComplete;
      transaction.objectStore('userData').clear().onsuccess = checkComplete;
      transaction.objectStore('syncQueue').clear().onsuccess = checkComplete;

      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getStorageUsage(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    }
    return { used: 0, available: 0 };
  }
}

export const offlineDB = new OfflineDB();