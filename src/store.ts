import { UIHighlight as OldHighlight, HighlightColor } from "./highlight";


export interface Highlight {
    id: string;                // Unique identifier (UUID)
    domain: string;            // Website domain where the highlight is created
    url: string;               // Full URL of the page
    text: string;              // Text content of the highlight
    position: {                // Position details for reconstructing the highlight
      startOffset: number;
      endOffset: number;
      startXpath: string;
      endXpath: string;
    };
    color: HighlightColor;             // Highlight color
    createdAt: string;         // ISO timestamp
    userId?: string;           // (Optional) User ID for remote syncing
  }
  

export function storeHighlight(highlight: OldHighlight) {
    console.log(highlight)
}


const DB_NAME = "HighlightsDB";
const STORE_NAME = "highlights";

async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveHighlight(highlight: Highlight): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  console.log("storing highlight")
  console.log(highlight)
  store.put(highlight);
}

export async function getHighlightsForDomain(domain: string): Promise<Highlight[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result as Highlight[]).filter((highlight) => highlight.domain === domain);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}
