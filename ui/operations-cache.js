// Operations cache sistemi
// API çağrılarını azaltmak için 5 dakikalık cache

let operationsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

export async function loadOperationsWithCache(apiBaseUrl) {
  try {
    // Cache kontrolü
    const now = Date.now();
    if (operationsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('🎯 Operations cache hit - using cached data');
      return operationsCache;
    }

    console.log('🔄 Operations cache miss - fetching from API');
    
    // API'den yükle
    const url = `${apiBaseUrl}/api/Operations?status=active`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const apiResponse = await response.json();
    const operations = Array.isArray(apiResponse) ? apiResponse : (apiResponse.data || []);
    
    // Cache'e kaydet
    operationsCache = operations;
    cacheTimestamp = now;
    
    console.log(`✅ Operations loaded and cached: ${operations.length} items`);
    return operations;

  } catch (err) {
    console.error('❌ Operations loading error:', err);
    
    // Hata durumunda eski cache'i kullan (varsa)
    if (operationsCache) {
      console.log('⚠️ Using stale cache due to API error');
      return operationsCache;
    }
    
    throw err;
  }
}

// Cache'i temizle (manuel refresh için)
export function clearOperationsCache() {
  console.log('🗑️ Operations cache cleared');
  operationsCache = null;
  cacheTimestamp = null;
}

// Cache durumunu kontrol et
export function getOperationsCacheInfo() {
  const now = Date.now();
  const isValid = operationsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION;
  const age = cacheTimestamp ? now - cacheTimestamp : null;
  
  return {
    cached: !!operationsCache,
    valid: isValid,
    age: age,
    itemCount: operationsCache ? operationsCache.length : 0
  };
}