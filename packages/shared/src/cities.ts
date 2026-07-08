// GENERATED from the original zero-patients/Pandemic repo's city data — do not edit by hand.
// x/y are board positions as fractions of a 16:9 canvas (origin top-left).

import type { DiseaseColor } from './protocol.js';

export interface CityDef {
  readonly name: string;
  readonly color: DiseaseColor;
  readonly x: number;
  readonly y: number;
  readonly neighbors: readonly string[];
}

export const CITIES = {
  'algiers': { name: 'Algiers', color: 'black', x: 0.4875, y: 0.4758, neighbors: ['cairo', 'istanbul', 'madrid', 'paris'] },
  'atlanta': { name: 'Atlanta', color: 'blue', x: 0.2145, y: 0.4526, neighbors: ['chicago', 'miami', 'washington'] },
  'baghdad': { name: 'Baghdad', color: 'black', x: 0.6106, y: 0.4582, neighbors: ['cairo', 'istanbul', 'riyadh', 'tehran'] },
  'bangkok': { name: 'Bangkok', color: 'red', x: 0.7463, y: 0.592, neighbors: ['chennai', 'ho-chi-minh-city', 'hong-kong', 'jakarta', 'kolkata'] },
  'beijing': { name: 'Beijing', color: 'red', x: 0.7573, y: 0.369, neighbors: ['seoul', 'shanghai'] },
  'bogota': { name: 'Bogota', color: 'yellow', x: 0.2902, y: 0.645, neighbors: ['buenos-aires', 'lima', 'mexico-city', 'miami', 'sao-paulo'] },
  'buenos-aires': { name: 'Buenos Aires', color: 'yellow', x: 0.3398, y: 0.8243, neighbors: ['bogota', 'sao-paulo'] },
  'cairo': { name: 'Cairo', color: 'black', x: 0.5407, y: 0.513, neighbors: ['algiers', 'baghdad', 'istanbul', 'khartoum', 'riyadh'] },
  'chennai': { name: 'Chennai', color: 'black', x: 0.703, y: 0.6478, neighbors: ['bangkok', 'delhi', 'jakarta', 'kolkata', 'mumbai'] },
  'chicago': { name: 'Chicago', color: 'blue', x: 0.2093, y: 0.3783, neighbors: ['atlanta', 'los-angeles', 'mexico-city', 'montreal', 'san-francisco'] },
  'delhi': { name: 'Delhi', color: 'black', x: 0.6879, y: 0.473, neighbors: ['chennai', 'karachi', 'kolkata', 'mumbai', 'tehran'] },
  'essen': { name: 'Essen', color: 'blue', x: 0.5198, y: 0.3058, neighbors: ['london', 'milan', 'paris', 'st-petersburg'] },
  'ho-chi-minh-city': { name: 'Ho Chi Minh City', color: 'red', x: 0.7886, y: 0.6338, neighbors: ['bangkok', 'hong-kong', 'jakarta', 'manila'] },
  'hong-kong': { name: 'Hong Kong', color: 'red', x: 0.7677, y: 0.5223, neighbors: ['bangkok', 'ho-chi-minh-city', 'kolkata', 'manila', 'shanghai', 'taipei'] },
  'istanbul': { name: 'Istanbul', color: 'black', x: 0.5877, y: 0.4154, neighbors: ['algiers', 'baghdad', 'cairo', 'milan', 'moscow', 'st-petersburg'] },
  'jakarta': { name: 'Jakarta', color: 'red', x: 0.7547, y: 0.6864, neighbors: ['bangkok', 'chennai', 'ho-chi-minh-city', 'sydney'] },
  'johannesburg': { name: 'Johannesburg', color: 'yellow', x: 0.5511, y: 0.75, neighbors: ['khartoum', 'kinshasa'] },
  'karachi': { name: 'Karachi', color: 'black', x: 0.6477, y: 0.5223, neighbors: ['delhi', 'mumbai', 'riyadh', 'tehran'] },
  'khartoum': { name: 'Khartoum', color: 'yellow', x: 0.5564, y: 0.592, neighbors: ['cairo', 'johannesburg', 'kinshasa', 'lagos'] },
  'kinshasa': { name: 'Kinshasa', color: 'yellow', x: 0.5068, y: 0.7175, neighbors: ['johannesburg', 'khartoum', 'lagos'] },
  'kolkata': { name: 'Kolkata', color: 'black', x: 0.726, y: 0.5316, neighbors: ['bangkok', 'chennai', 'delhi', 'hong-kong'] },
  'lagos': { name: 'Lagos', color: 'yellow', x: 0.4833, y: 0.6059, neighbors: ['khartoum', 'kinshasa', 'sao-paulo'] },
  'lima': { name: 'Lima', color: 'yellow', x: 0.2515, y: 0.7, neighbors: ['bogota', 'mexico-city', 'santiago'] },
  'london': { name: 'London', color: 'blue', x: 0.452, y: 0.3504, neighbors: ['essen', 'madrid', 'new-york', 'paris'] },
  'los-angeles': { name: 'Los Angeles', color: 'yellow', x: 0.1441, y: 0.4526, neighbors: ['chicago', 'mexico-city', 'san-francisco', 'sydney'] },
  'madrid': { name: 'Madrid', color: 'blue', x: 0.4363, y: 0.4665, neighbors: ['algiers', 'london', 'new-york', 'paris', 'sao-paulo'] },
  'manila': { name: 'Manila', color: 'red', x: 0.8539, y: 0.6664, neighbors: ['ho-chi-minh-city', 'hong-kong', 'san-francisco', 'sydney', 'taipei'] },
  'mexico-city': { name: 'Mexico City', color: 'yellow', x: 0.191, y: 0.5362, neighbors: ['bogota', 'chicago', 'lima', 'los-angeles', 'miami'] },
  'miami': { name: 'Miami', color: 'yellow', x: 0.2589, y: 0.5084, neighbors: ['atlanta', 'bogota', 'mexico-city', 'washington'] },
  'milan': { name: 'Milan', color: 'blue', x: 0.5329, y: 0.4061, neighbors: ['essen', 'istanbul', 'paris'] },
  'montreal': { name: 'Montreal', color: 'blue', x: 0.2537, y: 0.3875, neighbors: ['chicago', 'new-york', 'washington'] },
  'moscow': { name: 'Moscow', color: 'black', x: 0.6112, y: 0.3364, neighbors: ['istanbul', 'st-petersburg', 'tehran'] },
  'mumbai': { name: 'Mumbai', color: 'black', x: 0.6686, y: 0.5799, neighbors: ['chennai', 'delhi', 'karachi'] },
  'new-york': { name: 'New York', color: 'blue', x: 0.2902, y: 0.4061, neighbors: ['london', 'madrid', 'montreal', 'washington'] },
  'osaka': { name: 'Osaka', color: 'red', x: 0.846, y: 0.4712, neighbors: ['taipei', 'tokyo'] },
  'paris': { name: 'Paris', color: 'blue', x: 0.4911, y: 0.4126, neighbors: ['algiers', 'essen', 'london', 'madrid', 'milan'] },
  'riyadh': { name: 'Riyadh', color: 'black', x: 0.5981, y: 0.5548, neighbors: ['baghdad', 'cairo', 'karachi'] },
  'san-francisco': { name: 'San Francisco', color: 'blue', x: 0.1258, y: 0.369, neighbors: ['chicago', 'los-angeles', 'manila', 'tokyo'] },
  'santiago': { name: 'Santiago', color: 'yellow', x: 0.2615, y: 0.83, neighbors: ['lima'] },
  'sao-paulo': { name: 'Sao Paulo', color: 'yellow', x: 0.3554, y: 0.7314, neighbors: ['bogota', 'buenos-aires', 'lagos', 'madrid'] },
  'seoul': { name: 'Seoul', color: 'red', x: 0.833, y: 0.3615, neighbors: ['beijing', 'shanghai', 'tokyo'] },
  'shanghai': { name: 'Shanghai', color: 'red', x: 0.7651, y: 0.4433, neighbors: ['beijing', 'hong-kong', 'seoul', 'taipei', 'tokyo'] },
  'st-petersburg': { name: 'St Petersburg', color: 'blue', x: 0.5746, y: 0.2993, neighbors: ['essen', 'istanbul', 'moscow'] },
  'sydney': { name: 'Sydney', color: 'red', x: 0.8721, y: 0.81, neighbors: ['jakarta', 'los-angeles', 'manila'] },
  'taipei': { name: 'Taipei', color: 'red', x: 0.8121, y: 0.5316, neighbors: ['hong-kong', 'manila', 'osaka', 'shanghai'] },
  'tehran': { name: 'Tehran', color: 'black', x: 0.6399, y: 0.4061, neighbors: ['baghdad', 'delhi', 'karachi', 'moscow'] },
  'tokyo': { name: 'Tokyo', color: 'red', x: 0.8904, y: 0.4294, neighbors: ['osaka', 'san-francisco', 'seoul', 'shanghai'] },
  'washington': { name: 'Washington', color: 'blue', x: 0.2563, y: 0.4572, neighbors: ['atlanta', 'miami', 'montreal', 'new-york'] },
} as const satisfies Record<string, CityDef>;

export type CityId = keyof typeof CITIES;

export const CITY_IDS = Object.keys(CITIES) as CityId[];

export const isCityId = (v: string): v is CityId => v in CITIES;
