const earthRadiusKm = 6371;

function hasValidCoordinates(point) {
  return (
    point !== null &&
    typeof point === "object" &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

export function distanceKm(location, store) {
  if (
    !hasValidCoordinates(location) ||
    !hasValidCoordinates(store)
  ) {
    return null;
  }

  const latitudeDifference = toRadians(
    store.latitude - location.latitude,
  );

  const longitudeDifference = toRadians(
    store.longitude - location.longitude,
  );

  const haversineValue =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(location.latitude)) *
      Math.cos(toRadians(store.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const boundedValue = Math.max(
    0,
    Math.min(1, haversineValue),
  );

  const centralAngle =
    2 *
    Math.atan2(
      Math.sqrt(boundedValue),
      Math.sqrt(1 - boundedValue),
    );

  return earthRadiusKm * centralAngle;
}