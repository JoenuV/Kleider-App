export * from './types';
export { generateOutfits, evaluateOutfit, alternativesFor, SLOT_ORDER, isEligible, type Alternative } from './generate';
export { buildPreferences, EMPTY_PREFS, setKey, type Preferences } from './learning';
export { weatherNeeds, NO_WEATHER, type WeatherNeeds } from './weatherNeeds';
export { randomSeed } from './rng';
