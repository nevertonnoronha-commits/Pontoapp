/**
 * Haversine formula to calculate distance between two GPS coordinates.
 * Returns distance in meters.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

/**
 * Check if a given location is within the allowed radius of a store.
 */
export function isWithinRadius(
  userLat: number,
  userLon: number,
  storeLat: number,
  storeLon: number,
  radiusMeters: number
): { isValid: boolean; distance: number } {
  const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
  return {
    isValid: distance <= radiusMeters,
    distance,
  };
}

/**
 * Get GPS coordinates using browser geolocation API.
 * Returns a promise that resolves with position or rejects with error.
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não suportada pelo seu navegador."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

/**
 * Convert GeolocationPositionError to user-friendly PT-BR message.
 */
export function getGeoErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Permissão de localização negada. Por favor, permita o acesso à localização.";
    case error.POSITION_UNAVAILABLE:
      return "Localização indisponível. Verifique se o GPS está ativado.";
    case error.TIMEOUT:
      return "Tempo esgotado ao obter localização. Tente novamente.";
    default:
      return "Erro ao obter localização. Tente novamente.";
  }
}
