type Longitudes = { Sun: number; Moon: number };
type LunarPosition = {
  longitude: number;
  latitude: number;
  distanceKm: number;
};
const RAD = Math.PI / 180;
const norm = (n: number) => ((n % 360) + 360) % 360;

function segmentIndex(value: number, segments: number) {
  return Math.floor(norm(value) / (360 / segments));
}

export function findNextSegmentTransition(
  jd: number,
  segments: number,
  valueAt: (at: number) => number,
  maxDays = 4,
) {
  const initial = segmentIndex(valueAt(jd), segments);
  const step = 1 / 48;
  let lower = jd,
    upper = jd + step;
  while (
    upper <= jd + maxDays &&
    segmentIndex(valueAt(upper), segments) === initial
  ) {
    lower = upper;
    upper += step;
  }
  if (upper > jd + maxDays)
    throw new Error(
      `No ${segments}-segment transition found within ${maxDays} days`,
    );
  // 32 bisections at a 30-minute bracket resolve substantially below one
  // millisecond while avoiding unnecessary high-cost ephemeris evaluations.
  for (let i = 0; i < 32; i++) {
    const midpoint = (lower + upper) / 2;
    if (segmentIndex(valueAt(midpoint), segments) === initial) lower = midpoint;
    else upper = midpoint;
  }
  return upper;
}

function gmst(jd: number) {
  const t = (jd - 2451545) / 36525;
  return norm(
    280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t,
  );
}

export function sunAltitude(
  jd: number,
  latitude: number,
  longitude: number,
  sunLongitude: number,
) {
  const t = (jd - 2451545) / 36525;
  const epsilon = (23.439291 - 0.0130042 * t) * RAD;
  const lambda = sunLongitude * RAD;
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  const hourAngle = (gmst(jd) + longitude) * RAD - ra;
  const phi = latitude * RAD;
  return (
    Math.asin(
      Math.sin(phi) * Math.sin(dec) +
        Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle),
    ) / RAD
  );
}

export function moonAltitude(
  jd: number,
  latitude: number,
  longitude: number,
  position: LunarPosition,
) {
  const t = (jd - 2451545) / 36525,
    epsilon = (23.439291 - 0.0130042 * t) * RAD,
    lambda = position.longitude * RAD,
    beta = position.latitude * RAD;
  const ra = Math.atan2(
    Math.sin(lambda) * Math.cos(epsilon) - Math.tan(beta) * Math.sin(epsilon),
    Math.cos(lambda),
  );
  const dec = Math.asin(
    Math.sin(beta) * Math.cos(epsilon) +
      Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda),
  );
  const hourAngle = (gmst(jd) + longitude) * RAD - ra,
    phi = latitude * RAD;
  return (
    Math.asin(
      Math.sin(phi) * Math.sin(dec) +
        Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle),
    ) / RAD
  );
}

export function findLunarEvents(
  jd: number,
  latitude: number,
  longitude: number,
  positionAt: (at: number) => LunarPosition,
) {
  const civilStart = Math.floor(jd - 0.5) + 0.5,
    roots: Array<{ jd: number; rising: boolean }> = [];
  const valueAt = (at: number) => {
    const position = positionAt(at),
      parallax = Math.asin(Math.min(1, 6378.14 / position.distanceKm)) / RAD,
      target = 0.7275 * parallax - 0.5667;
    return moonAltitude(at, latitude, longitude, position) - target;
  };
  let previousJd = civilStart,
    previous = valueAt(previousJd);
  for (let i = 1; i <= 144; i++) {
    const currentJd = civilStart + i / 144,
      current = valueAt(currentJd);
    if (previous * current < 0) {
      let low = previousJd,
        high = currentJd,
        lowValue = previous;
      for (let iteration = 0; iteration < 32; iteration++) {
        const mid = (low + high) / 2,
          value = valueAt(mid);
        if (lowValue * value <= 0) high = mid;
        else {
          low = mid;
          lowValue = value;
        }
      }
      roots.push({ jd: (low + high) / 2, rising: current > previous });
    }
    previousJd = currentJd;
    previous = current;
  }
  return {
    moonriseJulianDay: roots.find((root) => root.rising)?.jd ?? null,
    moonsetJulianDay: roots.find((root) => !root.rising)?.jd ?? null,
    validation: "research-preview; independent rise/set fixtures pending",
  };
}

export function findSolarEvents(
  jd: number,
  latitude: number,
  longitude: number,
  tropicalAt: (at: number) => Longitudes,
) {
  const civilStart = Math.floor(jd - 0.5) + 0.5;
  const roots: Array<{ jd: number; rising: boolean }> = [];
  const target = -0.833;
  let previousJd = civilStart,
    previous =
      sunAltitude(previousJd, latitude, longitude, tropicalAt(previousJd).Sun) -
      target;
  for (let i = 1; i <= 96; i++) {
    const currentJd = civilStart + i / 96;
    const current =
      sunAltitude(currentJd, latitude, longitude, tropicalAt(currentJd).Sun) -
      target;
    if (previous * current < 0) {
      let low = previousJd,
        high = currentJd,
        lowValue = previous;
      for (let iteration = 0; iteration < 32; iteration++) {
        const mid = (low + high) / 2;
        const value =
          sunAltitude(mid, latitude, longitude, tropicalAt(mid).Sun) - target;
        if (lowValue * value <= 0) high = mid;
        else {
          low = mid;
          lowValue = value;
        }
      }
      roots.push({ jd: (low + high) / 2, rising: current > previous });
    }
    previousJd = currentJd;
    previous = current;
  }
  return {
    sunriseJulianDay: roots.find((root) => root.rising)?.jd ?? null,
    sunsetJulianDay: roots.find((root) => !root.rising)?.jd ?? null,
  };
}

export function calculatePanchangaEvents(
  jd: number,
  latitude: number,
  longitude: number,
  siderealAt: (at: number) => Longitudes,
  tropicalAt: (at: number) => Longitudes,
) {
  const elongation = (at: number) =>
    norm(siderealAt(at).Moon - siderealAt(at).Sun);
  const nakshatra = (at: number) => siderealAt(at).Moon;
  const yoga = (at: number) => norm(siderealAt(at).Moon + siderealAt(at).Sun);
  return {
    ...findSolarEvents(jd, latitude, longitude, tropicalAt),
    nextTithiJulianDay: findNextSegmentTransition(jd, 30, elongation, 2),
    nextNakshatraJulianDay: findNextSegmentTransition(jd, 27, nakshatra, 3),
    nextYogaJulianDay: findNextSegmentTransition(jd, 27, yoga, 3),
    nextKaranaJulianDay: findNextSegmentTransition(jd, 60, elongation, 1.5),
  };
}
