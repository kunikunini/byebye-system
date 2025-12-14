export function buildSkuSerial(n: number) {
  return String(n).padStart(4, '0');
}

export function todayStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function makeSku(prefix: string, yyyymmdd: string, serial: string) {
  return `${prefix}-${yyyymmdd}-${serial}`;
}

