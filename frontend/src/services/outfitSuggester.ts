import { GenderOption } from '../types/types'; // Import GenderOption

export interface WeatherData {
  feelsLike: number; // Celsius
  temperature: number; // Celsius
  precipitationChance?: number; // Percentage (0-100)
  weatherMain?: string; // e.g., 'Rain', 'Snow', 'Clouds', 'Clear', 'Mist', 'Drizzle'
  weatherDescription?: string; // e.g., 'light rain', 'scattered clouds'
  uvIndex?: number;
  windSpeed?: number; // m/s
  isDay?: boolean; // To differentiate between, e.g., clear day vs clear night for sun advice
  datetime?: string; // ISO string or similar, for date/time context
}

export interface OutfitSuggestion {
  items: string[];
  advice: string[];
}

// Clothing item identifiers
const OUTFIT_ITEMS = {
  T_SHIRT: 't_shirt',
  LONG_SLEEVE_SHIRT: 'long_sleeve_shirt',
  SWEATER: 'sweater',
  FLEECE_JACKET: 'fleece_jacket',
  LIGHT_JACKET: 'light_jacket',
  MEDIUM_JACKET: 'medium_jacket',
  HEAVY_COAT: 'heavy_coat',
  SHORTS: 'shorts',
  PANTS: 'pants',
  RAINCOAT: 'raincoat',
  UMBRELLA: 'umbrella',
  SUNGLASSES: 'sunglasses',
  SUN_HAT: 'sun_hat',
  WINTER_HAT: 'winter_hat',
  GLOVES: 'gloves',
  SCARF: 'scarf',
  SANDALS: 'sandals',
  SNEAKERS: 'sneakers',
  BOOTS: 'boots',
  WATERPROOF_SHOES: 'waterproof_shoes',
  // New items
  BLOUSE: 'blouse',
  DRESS: 'dress',
  SKIRT: 'skirt',
  CARDIGAN: 'cardigan',
  POLO_SHIRT: 'polo_shirt',
  TANK_TOP: 'tank_top',
};

export function suggestOutfit(weather: WeatherData, gender?: GenderOption): OutfitSuggestion {
  const suggestedItems: Set<string> = new Set();
  const adviceText: Set<string> = new Set();

  // 1. Determine base outfit by 'feelsLike' temperature
  if (weather.feelsLike > 28) {
    if (gender === 'Woman') {
      suggestedItems.add(OUTFIT_ITEMS.TANK_TOP); // or BLOUSE or DRESS
      // Allow for DRESS or SKIRT + TOP combination
      if (Math.random() < 0.5) { // Randomly suggest dress or skirt+top for variety
        suggestedItems.add(OUTFIT_ITEMS.DRESS);
      } else {
        suggestedItems.add(OUTFIT_ITEMS.SKIRT);
        // TANK_TOP is already added, or could add BLOUSE here if not TANK_TOP
      }
      suggestedItems.add(OUTFIT_ITEMS.SANDALS);
    } else if (gender === 'Man') {
      suggestedItems.add(OUTFIT_ITEMS.TANK_TOP); // or T_SHIRT or POLO_SHIRT
      suggestedItems.add(OUTFIT_ITEMS.SHORTS);
      suggestedItems.add(OUTFIT_ITEMS.SANDALS);
    } else { // Non-binary or undefined gender - default to most neutral
      suggestedItems.add(OUTFIT_ITEMS.TANK_TOP);
      suggestedItems.add(OUTFIT_ITEMS.SHORTS);
      suggestedItems.add(OUTFIT_ITEMS.SANDALS);
    }
    adviceText.add('It\'s hot! Dress light and stay hydrated.');
  } else if (weather.feelsLike >= 22 && weather.feelsLike <= 28) {
    if (gender === 'Woman') {
      suggestedItems.add(OUTFIT_ITEMS.T_SHIRT); // or BLOUSE
      // SKIRT or PANTS
      if (Math.random() < 0.5) {
        suggestedItems.add(OUTFIT_ITEMS.SKIRT);
      } else {
        suggestedItems.add(OUTFIT_ITEMS.PANTS);
      }
      suggestedItems.add(OUTFIT_ITEMS.SNEAKERS); // or SANDALS
    } else if (gender === 'Man') {
      suggestedItems.add(OUTFIT_ITEMS.T_SHIRT); // or POLO_SHIRT
      suggestedItems.add(OUTFIT_ITEMS.PANTS); // or SHORTS if closer to 28C
      suggestedItems.add(OUTFIT_ITEMS.SNEAKERS);
    } else { // Non-binary or undefined gender
      suggestedItems.add(OUTFIT_ITEMS.T_SHIRT);
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.SNEAKERS);
    }
    adviceText.add('Warm weather. Comfortable clothing recommended.');
  } else if (weather.feelsLike >= 16 && weather.feelsLike <= 21) {
    if (gender === 'Woman') {
      suggestedItems.add(OUTFIT_ITEMS.T_SHIRT); // or BLOUSE or LONG_SLEEVE_SHIRT
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.SNEAKERS);
      if (weather.windSpeed && weather.windSpeed > 4 || weather.isDay === false || weather.feelsLike < 18) {
        suggestedItems.add(OUTFIT_ITEMS.LIGHT_JACKET); // or CARDIGAN
      }
    } else if (gender === 'Man') {
      suggestedItems.add(OUTFIT_ITEMS.T_SHIRT); // or POLO_SHIRT or LONG_SLEEVE_SHIRT
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.SNEAKERS);
      if (weather.windSpeed && weather.windSpeed > 4 || weather.isDay === false || weather.feelsLike < 18) {
        suggestedItems.add(OUTFIT_ITEMS.LIGHT_JACKET);
      }
    } else { // Non-binary or undefined gender
      suggestedItems.add(OUTFIT_ITEMS.T_SHIRT);
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.SNEAKERS);
      if (weather.windSpeed && weather.windSpeed > 4 || weather.isDay === false || weather.feelsLike < 18) {
          suggestedItems.add(OUTFIT_ITEMS.LIGHT_JACKET);
      }
    }
    adviceText.add('Mild temperatures. A light layer might be useful.');
  } else if (weather.feelsLike >= 10 && weather.feelsLike <= 15) {
    if (gender === 'Woman') {
      suggestedItems.add(OUTFIT_ITEMS.LONG_SLEEVE_SHIRT); // or BLOUSE
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      // Suggest CARDIGAN or LIGHT_JACKET
      if (weather.windSpeed && weather.windSpeed > 5) { // Prefer jacket if windy
        suggestedItems.add(OUTFIT_ITEMS.LIGHT_JACKET);
      } else {
        suggestedItems.add(OUTFIT_ITEMS.CARDIGAN);
      }
      suggestedItems.add(OUTFIT_ITEMS.SNEAKERS); // or BOOTS if closer to 10C or wet
    } else if (gender === 'Man') {
      suggestedItems.add(OUTFIT_ITEMS.LONG_SLEEVE_SHIRT); // or long-sleeve POLO_SHIRT
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.LIGHT_JACKET);
      suggestedItems.add(OUTFIT_ITEMS.SNEAKERS); // or BOOTS if closer to 10C or wet
    } else { // Non-binary or undefined gender
      suggestedItems.add(OUTFIT_ITEMS.LONG_SLEEVE_SHIRT);
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.LIGHT_JACKET);
      suggestedItems.add(OUTFIT_ITEMS.SNEAKERS); // or BOOTS if closer to 10C or wet
    }
    adviceText.add('Cool weather. Layers are a good idea.');
  } else if (weather.feelsLike >= 4 && weather.feelsLike <= 9) {
    // Base items are largely unisex here due to cold
    if (gender === 'Woman') {
      suggestedItems.add(OUTFIT_ITEMS.LONG_SLEEVE_SHIRT); // Base layer
      suggestedItems.add(OUTFIT_ITEMS.SWEATER); // Mid layer or FLEECE_JACKET
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.MEDIUM_JACKET);
    } else if (gender === 'Man') {
      suggestedItems.add(OUTFIT_ITEMS.LONG_SLEEVE_SHIRT); // Base layer
      suggestedItems.add(OUTFIT_ITEMS.SWEATER); // Mid layer or FLEECE_JACKET
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.MEDIUM_JACKET);
    } else { // Non-binary or undefined gender
      suggestedItems.add(OUTFIT_ITEMS.LONG_SLEEVE_SHIRT); // Base layer
      suggestedItems.add(OUTFIT_ITEMS.SWEATER);
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.MEDIUM_JACKET);
    }
    // Common accessories for cold
    suggestedItems.add(OUTFIT_ITEMS.BOOTS);
    suggestedItems.add(OUTFIT_ITEMS.SCARF);
    suggestedItems.add(OUTFIT_ITEMS.WINTER_HAT);
    adviceText.add('Cold conditions. Dress warmly with layers.');
  } else if (weather.feelsLike < 4) {
    // Base items are very unisex here due to extreme cold
    if (gender === 'Woman') {
      suggestedItems.add(OUTFIT_ITEMS.LONG_SLEEVE_SHIRT); // Base layer
      suggestedItems.add(OUTFIT_ITEMS.SWEATER); // Mid layer (fleece could also be an option)
      suggestedItems.add(OUTFIT_ITEMS.PANTS); // Consider thermal pants if available as an item
      suggestedItems.add(OUTFIT_ITEMS.HEAVY_COAT);
    } else if (gender === 'Man') {
      suggestedItems.add(OUTFIT_ITEMS.LONG_SLEEVE_SHIRT);
      suggestedItems.add(OUTFIT_ITEMS.SWEATER);
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.HEAVY_COAT);
    } else { // Non-binary or undefined gender
      suggestedItems.add(OUTFIT_ITEMS.LONG_SLEEVE_SHIRT);
      suggestedItems.add(OUTFIT_ITEMS.SWEATER);
      suggestedItems.add(OUTFIT_ITEMS.PANTS);
      suggestedItems.add(OUTFIT_ITEMS.HEAVY_COAT);
    }
    // Common accessories for very cold
    suggestedItems.add(OUTFIT_ITEMS.WINTER_HAT);
    suggestedItems.add(OUTFIT_ITEMS.GLOVES);
    suggestedItems.add(OUTFIT_ITEMS.SCARF);
    suggestedItems.add(OUTFIT_ITEMS.BOOTS); // Ensure warm, waterproof boots
    adviceText.add('Very cold! Bundle up with multiple warm layers, hat, gloves, and scarf.');
  }

  // 2. Apply precipitation rules
  const isRaining = weather.weatherMain === 'Rain' || weather.weatherMain === 'Drizzle';
  const isSnowing = weather.weatherMain === 'Snow';

  if (isRaining || (weather.precipitationChance && weather.precipitationChance > 40)) {
    if (!suggestedItems.has(OUTFIT_ITEMS.HEAVY_COAT) && !suggestedItems.has(OUTFIT_ITEMS.MEDIUM_JACKET)) {
        suggestedItems.add(OUTFIT_ITEMS.RAINCOAT);
    } else {
        adviceText.add('Your current jacket should offer some rain protection.');
    }
    suggestedItems.add(OUTFIT_ITEMS.UMBRELLA); // Umbrella is almost always a good addition for rain
    // Consider footwear
    if(suggestedItems.has(OUTFIT_ITEMS.SNEAKERS) || suggestedItems.has(OUTFIT_ITEMS.SANDALS)){
        suggestedItems.delete(OUTFIT_ITEMS.SNEAKERS);
        suggestedItems.delete(OUTFIT_ITEMS.SANDALS);
        suggestedItems.add(OUTFIT_ITEMS.WATERPROOF_SHOES); 
    }
    adviceText.add('Expect rain. Waterproof gear and an umbrella are recommended.');
  }
  if (isSnowing) {
    suggestedItems.add(OUTFIT_ITEMS.HEAVY_COAT);
    suggestedItems.add(OUTFIT_ITEMS.WINTER_HAT);
    suggestedItems.add(OUTFIT_ITEMS.GLOVES);
    suggestedItems.add(OUTFIT_ITEMS.SCARF);
    if(suggestedItems.has(OUTFIT_ITEMS.SNEAKERS) || suggestedItems.has(OUTFIT_ITEMS.SANDALS)){
        suggestedItems.delete(OUTFIT_ITEMS.SNEAKERS);
        suggestedItems.delete(OUTFIT_ITEMS.SANDALS);
    }
    suggestedItems.add(OUTFIT_ITEMS.BOOTS); // Ensure boots for snow
    adviceText.add('Snowfall likely. Dress warmly with waterproof outer layers and boots.');
  }

  // 3. Apply sun rules (only if not raining/snowing heavily and during the day)
  if (weather.isDay === true && !isRaining && !isSnowing && (weather.weatherMain === 'Clear' || (weather.uvIndex && weather.uvIndex > 3))) {
    suggestedItems.add(OUTFIT_ITEMS.SUNGLASSES);
    if (weather.feelsLike > 15) { // Add sun hat only if it's warm enough
      suggestedItems.add(OUTFIT_ITEMS.SUN_HAT);
    }
    adviceText.add('Sunny conditions. Consider sunglasses and sun protection.');
  }

  // 4. Apply wind rules
  if (weather.windSpeed && weather.windSpeed > 6) {
    if (
      !suggestedItems.has(OUTFIT_ITEMS.LIGHT_JACKET) &&
      !suggestedItems.has(OUTFIT_ITEMS.MEDIUM_JACKET) &&
      !suggestedItems.has(OUTFIT_ITEMS.HEAVY_COAT) &&
      !suggestedItems.has(OUTFIT_ITEMS.RAINCOAT)
    ) {
      suggestedItems.add(OUTFIT_ITEMS.LIGHT_JACKET); // Add a windbreaker if no other jacket
    }
    adviceText.add('It\'s windy! This might make it feel colder. A windproof layer is advisable.');
  }

  return {
    items: Array.from(suggestedItems),
    advice: Array.from(adviceText),
  };
}
