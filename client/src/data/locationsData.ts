/**
 * Curated list of ISO countries and primary global tech/business hubs.
 * Provides hierarchical lookup: country -> matching cities.
 */
export interface CountryLocation {
  name: string;
  code: string;
  cities: string[];
}

export const COUNTRIES_DATA: CountryLocation[] = [
  {
    name: "India",
    code: "IN",
    cities: [
      "Bengaluru",
      "Mumbai",
      "Delhi",
      "Hyderabad",
      "Pune",
      "Chennai",
      "Gurugram",
      "Noida",
      "Kolkata",
      "Ahmedabad",
      "Jaipur",
      "Kochi",
      "Chandigarh",
      "Indore",
      "Coimbatore",
      "Thiruvananthapuram",
      "Bhubaneswar",
      "Nagpur",
      "Visakhapatnam",
      "Lucknow",
    ],
  },
  {
    name: "United States",
    code: "US",
    cities: [
      "San Francisco",
      "New York",
      "Seattle",
      "Austin",
      "Boston",
      "Los Angeles",
      "Chicago",
      "Denver",
      "San Jose",
      "Atlanta",
      "San Diego",
      "Dallas",
      "Washington, D.C.",
      "Miami",
      "Portland",
      "Phoenix",
    ],
  },
  {
    name: "United Kingdom",
    code: "GB",
    cities: [
      "London",
      "Manchester",
      "Edinburgh",
      "Birmingham",
      "Cambridge",
      "Oxford",
      "Bristol",
      "Leeds",
      "Glasgow",
      "Belfast",
    ],
  },
  {
    name: "Canada",
    code: "CA",
    cities: [
      "Toronto",
      "Vancouver",
      "Montreal",
      "Ottawa",
      "Calgary",
      "Waterloo",
      "Edmonton",
      "Quebec City",
    ],
  },
  {
    name: "Germany",
    code: "DE",
    cities: [
      "Berlin",
      "Munich",
      "Frankfurt",
      "Hamburg",
      "Cologne",
      "Stuttgart",
      "Dusseldorf",
      "Leipzig",
    ],
  },
  {
    name: "Australia",
    code: "AU",
    cities: [
      "Sydney",
      "Melbourne",
      "Brisbane",
      "Perth",
      "Adelaide",
      "Canberra",
    ],
  },
  {
    name: "Singapore",
    code: "SG",
    cities: ["Singapore"],
  },
  {
    name: "United Arab Emirates",
    code: "AE",
    cities: [
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
    ],
  },
  {
    name: "Netherlands",
    code: "NL",
    cities: [
      "Amsterdam",
      "Rotterdam",
      "Utrecht",
      "The Hague",
      "Eindhoven",
    ],
  },
  {
    name: "France",
    code: "FR",
    cities: [
      "Paris",
      "Lyon",
      "Toulouse",
      "Marseille",
      "Bordeaux",
      "Nantes",
    ],
  },
  {
    name: "Ireland",
    code: "IE",
    cities: [
      "Dublin",
      "Cork",
      "Galway",
      "Limerick",
    ],
  },
  {
    name: "Japan",
    code: "JP",
    cities: [
      "Tokyo",
      "Osaka",
      "Kyoto",
      "Yokohama",
      "Fukuoka",
    ],
  },
  {
    name: "Switzerland",
    code: "CH",
    cities: [
      "Zurich",
      "Geneva",
      "Basel",
      "Lausanne",
      "Bern",
    ],
  },
  {
    name: "Sweden",
    code: "SE",
    cities: [
      "Stockholm",
      "Gothenburg",
      "Malmo",
      "Uppsala",
    ],
  },
  {
    name: "Spain",
    code: "ES",
    cities: [
      "Madrid",
      "Barcelona",
      "Valencia",
      "Seville",
      "Malaga",
    ],
  },
  {
    name: "Poland",
    code: "PL",
    cities: [
      "Warsaw",
      "Krakow",
      "Wroclaw",
      "Gdansk",
      "Poznan",
    ],
  },
  {
    name: "Brazil",
    code: "BR",
    cities: [
      "Sao Paulo",
      "Rio de Janeiro",
      "Belo Horizonte",
      "Curitiba",
      "Florianopolis",
    ],
  },
  {
    name: "New Zealand",
    code: "NZ",
    cities: [
      "Auckland",
      "Wellington",
      "Christchurch",
    ],
  },
  {
    name: "South Africa",
    code: "ZA",
    cities: [
      "Cape Town",
      "Johannesburg",
      "Durban",
      "Pretoria",
    ],
  },
  {
    name: "Israel",
    code: "IL",
    cities: [
      "Tel Aviv",
      "Jerusalem",
      "Haifa",
    ],
  },
];

export const COUNTRY_NAMES = COUNTRIES_DATA.map((c) => c.name);

export function getCitiesForCountry(countryName?: string): string[] {
  if (!countryName) {
    // Return all prominent cities if country not selected
    const all = COUNTRIES_DATA.flatMap((c) => c.cities);
    return Array.from(new Set(all));
  }
  const match = COUNTRIES_DATA.find(
    (c) => c.name.toLowerCase() === countryName.trim().toLowerCase()
  );
  return match ? match.cities : [];
}

