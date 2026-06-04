/** 1 mile = 1.609344 km */
export const KM_PER_MILE = 1.609344;

export function kmToMiles(km: number): number {
  if (!Number.isFinite(km) || km < 0) return 0;
  return Math.round(km / KM_PER_MILE);
}

export function milesToKm(miles: number): number {
  if (!Number.isFinite(miles) || miles < 0) return 0;
  return Math.round(miles * KM_PER_MILE);
}

export function formatMileageDisplay(km: number): string {
  const miles = kmToMiles(km);
  return `${km.toLocaleString()} km (${miles.toLocaleString()} mi)`;
}

export function formatMileageRangeDisplay(minKm: number, maxKm: number): string {
  return `${minKm.toLocaleString()} – ${maxKm.toLocaleString()} km (${kmToMiles(minKm).toLocaleString()} – ${kmToMiles(maxKm).toLocaleString()} mi)`;
}
