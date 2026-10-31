export interface CityPostalInfo {
  city: string;
  country: string;
  countryCode?: string;
  state?: string;
  flag?: string;
  postalCodes: string[];
  lat?: number;
  lng?: number;
}

export const POPULAR_WORLD_CITIES: CityPostalInfo[] = [
  // Germany
  { city: 'Berlin', country: 'Germany', countryCode: 'DE', state: 'Berlin', flag: '🇩🇪', postalCodes: ['10115', '10117', '10178', '10785', '10435'], lat: 52.5200, lng: 13.4050 },
  { city: 'Munich', country: 'Germany', countryCode: 'DE', state: 'Bavaria', flag: '🇩🇪', postalCodes: ['80331', '80333', '80539', '80802'], lat: 48.1351, lng: 11.5820 },
  { city: 'München', country: 'Germany', countryCode: 'DE', state: 'Bavaria', flag: '🇩🇪', postalCodes: ['80331', '80333', '80539', '80802'], lat: 48.1351, lng: 11.5820 },
  { city: 'Frankfurt', country: 'Germany', countryCode: 'DE', state: 'Hesse', flag: '🇩🇪', postalCodes: ['60311', '60313', '60325', '60329'] },
  { city: 'Hamburg', country: 'Germany', countryCode: 'DE', state: 'Hamburg', flag: '🇩🇪', postalCodes: ['20095', '20354', '20457', '22767'] },
  { city: 'Cologne', country: 'Germany', countryCode: 'DE', state: 'North Rhine-Westphalia', flag: '🇩🇪', postalCodes: ['50667', '50672', '50674', '50676'] },
  { city: 'Köln', country: 'Germany', countryCode: 'DE', state: 'North Rhine-Westphalia', flag: '🇩🇪', postalCodes: ['50667', '50672', '50674', '50676'] },
  { city: 'Stuttgart', country: 'Germany', countryCode: 'DE', state: 'Baden-Württemberg', flag: '🇩🇪', postalCodes: ['70173', '70174', '70178'] },
  { city: 'Düsseldorf', country: 'Germany', countryCode: 'DE', state: 'North Rhine-Westphalia', flag: '🇩🇪', postalCodes: ['40212', '40213', '40477'] },
  { city: 'Dusseldorf', country: 'Germany', countryCode: 'DE', state: 'North Rhine-Westphalia', flag: '🇩🇪', postalCodes: ['40212', '40213', '40477'] },
  { city: 'Leipzig', country: 'Germany', countryCode: 'DE', state: 'Saxony', flag: '🇩🇪', postalCodes: ['04109', '04103', '04105'] },
  { city: 'Dresden', country: 'Germany', countryCode: 'DE', state: 'Saxony', flag: '🇩🇪', postalCodes: ['01067', '01069', '01097'] },
  { city: 'Nuremberg', country: 'Germany', countryCode: 'DE', state: 'Bavaria', flag: '🇩🇪', postalCodes: ['90402', '90403', '90408'] },
  { city: 'Nürnberg', country: 'Germany', countryCode: 'DE', state: 'Bavaria', flag: '🇩🇪', postalCodes: ['90402', '90403', '90408'] },
  { city: 'Hannover', country: 'Germany', countryCode: 'DE', state: 'Lower Saxony', flag: '🇩🇪', postalCodes: ['30159', '30161', '30175'] },
  { city: 'Bremen', country: 'Germany', countryCode: 'DE', state: 'Bremen', flag: '🇩🇪', postalCodes: ['28195', '28203', '28217'] },
  { city: 'Bonn', country: 'Germany', countryCode: 'DE', state: 'North Rhine-Westphalia', flag: '🇩🇪', postalCodes: ['53111', '53113', '53177'] },

  // United Kingdom
  { city: 'London', country: 'United Kingdom', countryCode: 'GB', state: 'Greater London', flag: '🇬🇧', postalCodes: ['EC1A', 'SW1A', 'W1D', 'E14', 'WC2N'] },
  { city: 'Manchester', country: 'United Kingdom', countryCode: 'GB', state: 'Greater Manchester', flag: '🇬🇧', postalCodes: ['M1', 'M2', 'M3', 'M4'] },
  { city: 'Birmingham', country: 'United Kingdom', countryCode: 'GB', state: 'West Midlands', flag: '🇬🇧', postalCodes: ['B1', 'B2', 'B3', 'B4'] },
  { city: 'Edinburgh', country: 'United Kingdom', countryCode: 'GB', state: 'Scotland', flag: '🇬🇧', postalCodes: ['EH1', 'EH2', 'EH3'] },
  { city: 'Glasgow', country: 'United Kingdom', countryCode: 'GB', state: 'Scotland', flag: '🇬🇧', postalCodes: ['G1', 'G2', 'G3'] },
  { city: 'Leeds', country: 'United Kingdom', countryCode: 'GB', state: 'West Yorkshire', flag: '🇬🇧', postalCodes: ['LS1', 'LS2', 'LS3'] },
  { city: 'Bristol', country: 'United Kingdom', countryCode: 'GB', state: 'South West', flag: '🇬🇧', postalCodes: ['BS1', 'BS2', 'BS8'] },
  { city: 'Liverpool', country: 'United Kingdom', countryCode: 'GB', state: 'Merseyside', flag: '🇬🇧', postalCodes: ['L1', 'L2', 'L3'] },
  { city: 'Newcastle', country: 'United Kingdom', countryCode: 'GB', state: 'Tyne and Wear', flag: '🇬🇧', postalCodes: ['NE1', 'NE2'] },
  { city: 'Belfast', country: 'United Kingdom', countryCode: 'GB', state: 'Northern Ireland', flag: '🇬🇧', postalCodes: ['BT1', 'BT2'] },
  { city: 'Cardiff', country: 'United Kingdom', countryCode: 'GB', state: 'Wales', flag: '🇬🇧', postalCodes: ['CF10', 'CF11'] },
  { city: 'Cambridge', country: 'United Kingdom', countryCode: 'GB', state: 'Cambridgeshire', flag: '🇬🇧', postalCodes: ['CB1', 'CB2'] },
  { city: 'Oxford', country: 'United Kingdom', countryCode: 'GB', state: 'Oxfordshire', flag: '🇬🇧', postalCodes: ['OX1', 'OX2'] },

  // United States
  { city: 'New York', country: 'United States', countryCode: 'US', state: 'NY', flag: '🇺🇸', postalCodes: ['10001', '10018', '10022', '10019', '10005'] },
  { city: 'San Francisco', country: 'United States', countryCode: 'US', state: 'CA', flag: '🇺🇸', postalCodes: ['94105', '94107', '94102', '94103', '94111'] },
  { city: 'Los Angeles', country: 'United States', countryCode: 'US', state: 'CA', flag: '🇺🇸', postalCodes: ['90012', '90015', '90017', '90028', '90210'] },
  { city: 'Chicago', country: 'United States', countryCode: 'US', state: 'IL', flag: '🇺🇸', postalCodes: ['60601', '60602', '60603', '60611', '60654'] },
  { city: 'Miami', country: 'United States', countryCode: 'US', state: 'FL', flag: '🇺🇸', postalCodes: ['33131', '33130', '33132', '33139'] },
  { city: 'Austin', country: 'United States', countryCode: 'US', state: 'TX', flag: '🇺🇸', postalCodes: ['78701', '78702', '78703', '78704'] },
  { city: 'Dallas', country: 'United States', countryCode: 'US', state: 'TX', flag: '🇺🇸', postalCodes: ['75201', '75202', '75204', '75219'] },
  { city: 'Houston', country: 'United States', countryCode: 'US', state: 'TX', flag: '🇺🇸', postalCodes: ['77002', '77006', '77010', '77019'] },
  { city: 'Seattle', country: 'United States', countryCode: 'US', state: 'WA', flag: '🇺🇸', postalCodes: ['98101', '98104', '98121', '98109'] },
  { city: 'Boston', country: 'United States', countryCode: 'US', state: 'MA', flag: '🇺🇸', postalCodes: ['02108', '02110', '02116', '02109'] },
  { city: 'Atlanta', country: 'United States', countryCode: 'US', state: 'GA', flag: '🇺🇸', postalCodes: ['30303', '30308', '30309', '30326'] },
  { city: 'Denver', country: 'United States', countryCode: 'US', state: 'CO', flag: '🇺🇸', postalCodes: ['80202', '80203', '80204', '80206'] },
  { city: 'Phoenix', country: 'United States', countryCode: 'US', state: 'AZ', flag: '🇺🇸', postalCodes: ['85004', '85012', '85016'] },
  { city: 'San Diego', country: 'United States', countryCode: 'US', state: 'CA', flag: '🇺🇸', postalCodes: ['92101', '92103', '92109'] },
  { city: 'Las Vegas', country: 'United States', countryCode: 'US', state: 'NV', flag: '🇺🇸', postalCodes: ['89101', '89109', '89169'] },
  { city: 'Philadelphia', country: 'United States', countryCode: 'US', state: 'PA', flag: '🇺🇸', postalCodes: ['19102', '19103', '19106'] },
  { city: 'Washington', country: 'United States', countryCode: 'US', state: 'DC', flag: '🇺🇸', postalCodes: ['20001', '20005', '20006', '20036'] },
  { city: 'Minneapolis', country: 'United States', countryCode: 'US', state: 'MN', flag: '🇺🇸', postalCodes: ['55401', '55402', '55403'] },
  { city: 'Orlando', country: 'United States', countryCode: 'US', state: 'FL', flag: '🇺🇸', postalCodes: ['32801', '32803', '32819'] },
  { city: 'Tampa', country: 'United States', countryCode: 'US', state: 'FL', flag: '🇺🇸', postalCodes: ['33602', '33606', '33607'] },
  { city: 'Nashville', country: 'United States', countryCode: 'US', state: 'TN', flag: '🇺🇸', postalCodes: ['37201', '37203', '37219'] },
  { city: 'Portland', country: 'United States', countryCode: 'US', state: 'OR', flag: '🇺🇸', postalCodes: ['97201', '97204', '97205'] },
  { city: 'Charlotte', country: 'United States', countryCode: 'US', state: 'NC', flag: '🇺🇸', postalCodes: ['28202', '28203', '28204'] },

  // France
  { city: 'Paris', country: 'France', countryCode: 'FR', state: 'Île-de-France', flag: '🇫🇷', postalCodes: ['75001', '75008', '75002', '75009', '75016'] },
  { city: 'Lyon', country: 'France', countryCode: 'FR', state: 'Auvergne-Rhône-Alpes', flag: '🇫🇷', postalCodes: ['69001', '69002', '69003'] },
  { city: 'Marseille', country: 'France', countryCode: 'FR', state: 'Provence-Alpes-Côte d\'Azur', flag: '🇫🇷', postalCodes: ['13001', '13002', '13006'] },
  { city: 'Bordeaux', country: 'France', countryCode: 'FR', state: 'Nouvelle-Aquitaine', flag: '🇫🇷', postalCodes: ['33000', '33300', '33800'] },
  { city: 'Toulouse', country: 'France', countryCode: 'FR', state: 'Occitanie', flag: '🇫🇷', postalCodes: ['31000', '31200', '31400'] },
  { city: 'Nice', country: 'France', countryCode: 'FR', state: 'Provence-Alpes-Côte d\'Azur', flag: '🇫🇷', postalCodes: ['06000', '06100', '06200'] },
  { city: 'Strasbourg', country: 'France', countryCode: 'FR', state: 'Grand Est', flag: '🇫🇷', postalCodes: ['67000', '67100'] },
  { city: 'Nantes', country: 'France', countryCode: 'FR', state: 'Pays de la Loire', flag: '🇫🇷', postalCodes: ['44000', '44100'] },
  { city: 'Lille', country: 'France', countryCode: 'FR', state: 'Hauts-de-France', flag: '🇫🇷', postalCodes: ['59000', '59800'] },

  // Canada
  { city: 'Toronto', country: 'Canada', countryCode: 'CA', state: 'ON', flag: '🇨🇦', postalCodes: ['M5V', 'M5H', 'M5J', 'M5C'] },
  { city: 'Vancouver', country: 'Canada', countryCode: 'CA', state: 'BC', flag: '🇨🇦', postalCodes: ['V6B', 'V6C', 'V6E', 'V6Z'] },
  { city: 'Montreal', country: 'Canada', countryCode: 'CA', state: 'QC', flag: '🇨🇦', postalCodes: ['H3B', 'H2Y', 'H3A', 'H2Z'] },
  { city: 'Montréal', country: 'Canada', countryCode: 'CA', state: 'QC', flag: '🇨🇦', postalCodes: ['H3B', 'H2Y', 'H3A', 'H2Z'] },
  { city: 'Calgary', country: 'Canada', countryCode: 'CA', state: 'AB', flag: '🇨🇦', postalCodes: ['T2P', 'T2G', 'T2R'] },
  { city: 'Ottawa', country: 'Canada', countryCode: 'CA', state: 'ON', flag: '🇨🇦', postalCodes: ['K1P', 'K1N', 'K1R'] },
  { city: 'Edmonton', country: 'Canada', countryCode: 'CA', state: 'AB', flag: '🇨🇦', postalCodes: ['T5J', 'T5K', 'T5H'] },

  // Australia
  { city: 'Sydney', country: 'Australia', countryCode: 'AU', state: 'NSW', flag: '🇦🇺', postalCodes: ['2000', '2001', '2060', '2010'] },
  { city: 'Melbourne', country: 'Australia', countryCode: 'AU', state: 'VIC', flag: '🇦🇺', postalCodes: ['3000', '3001', '3004', '3053'] },
  { city: 'Brisbane', country: 'Australia', countryCode: 'AU', state: 'QLD', flag: '🇦🇺', postalCodes: ['4000', '4006', '4101'] },
  { city: 'Perth', country: 'Australia', countryCode: 'AU', state: 'WA', flag: '🇦🇺', postalCodes: ['6000', '6004', '6005'] },
  { city: 'Adelaide', country: 'Australia', countryCode: 'AU', state: 'SA', flag: '🇦🇺', postalCodes: ['5000', '5006'] },

  // Switzerland
  { city: 'Zurich', country: 'Switzerland', countryCode: 'CH', state: 'Zurich', flag: '🇨🇭', postalCodes: ['8001', '8002', '8005', '8008'] },
  { city: 'Zürich', country: 'Switzerland', countryCode: 'CH', state: 'Zurich', flag: '🇨🇭', postalCodes: ['8001', '8002', '8005', '8008'] },
  { city: 'Geneva', country: 'Switzerland', countryCode: 'CH', state: 'Geneva', flag: '🇨🇭', postalCodes: ['1201', '1204', '1205', '1207'] },
  { city: 'Genf', country: 'Switzerland', countryCode: 'CH', state: 'Geneva', flag: '🇨🇭', postalCodes: ['1201', '1204', '1205', '1207'] },
  { city: 'Basel', country: 'Switzerland', countryCode: 'CH', state: 'Basel-Stadt', flag: '🇨🇭', postalCodes: ['4051', '4052', '4058'] },
  { city: 'Bern', country: 'Switzerland', countryCode: 'CH', state: 'Bern', flag: '🇨🇭', postalCodes: ['3011', '3007', '3012'] },
  { city: 'Lausanne', country: 'Switzerland', countryCode: 'CH', state: 'Vaud', flag: '🇨🇭', postalCodes: ['1003', '1005', '1007'] },

  // Austria
  { city: 'Vienna', country: 'Austria', countryCode: 'AT', state: 'Vienna', flag: '🇦🇹', postalCodes: ['1010', '1020', '1030', '1070'] },
  { city: 'Wien', country: 'Austria', countryCode: 'AT', state: 'Vienna', flag: '🇦🇹', postalCodes: ['1010', '1020', '1030', '1070'] },
  { city: 'Salzburg', country: 'Austria', countryCode: 'AT', state: 'Salzburg', flag: '🇦🇹', postalCodes: ['5020', '5026'] },
  { city: 'Graz', country: 'Austria', countryCode: 'AT', state: 'Styria', flag: '🇦🇹', postalCodes: ['8010', '8020'] },
  { city: 'Innsbruck', country: 'Austria', countryCode: 'AT', state: 'Tyrol', flag: '🇦🇹', postalCodes: ['6020'] },

  // Netherlands
  { city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', state: 'North Holland', flag: '🇳🇱', postalCodes: ['1012', '1082', '1017', '1077'] },
  { city: 'Rotterdam', country: 'Netherlands', countryCode: 'NL', state: 'South Holland', flag: '🇳🇱', postalCodes: ['3011', '3012', '3016'] },
  { city: 'The Hague', country: 'Netherlands', countryCode: 'NL', state: 'South Holland', flag: '🇳🇱', postalCodes: ['2511', '2513', '2517'] },
  { city: 'Den Haag', country: 'Netherlands', countryCode: 'NL', state: 'South Holland', flag: '🇳🇱', postalCodes: ['2511', '2513', '2517'] },
  { city: 'Utrecht', country: 'Netherlands', countryCode: 'NL', state: 'Utrecht', flag: '🇳🇱', postalCodes: ['3511', '3512', '3521'] },

  // Belgium
  { city: 'Brussels', country: 'Belgium', countryCode: 'BE', state: 'Brussels', flag: '🇧🇪', postalCodes: ['1000', '1050', '1040'] },
  { city: 'Bruxelles', country: 'Belgium', countryCode: 'BE', state: 'Brussels', flag: '🇧🇪', postalCodes: ['1000', '1050', '1040'] },
  { city: 'Antwerp', country: 'Belgium', countryCode: 'BE', state: 'Antwerp', flag: '🇧🇪', postalCodes: ['2000', '2018', '2060'] },
  { city: 'Ghent', country: 'Belgium', countryCode: 'BE', state: 'East Flanders', flag: '🇧🇪', postalCodes: ['9000'] },

  // Ireland
  { city: 'Dublin', country: 'Ireland', countryCode: 'IE', state: 'Leinster', flag: '🇮🇪', postalCodes: ['D02', 'D04', 'D01', 'D07'] },
  { city: 'Cork', country: 'Ireland', countryCode: 'IE', state: 'Munster', flag: '🇮🇪', postalCodes: ['T12'] },

  // Spain
  { city: 'Madrid', country: 'Spain', countryCode: 'ES', state: 'Community of Madrid', flag: '🇪🇸', postalCodes: ['28001', '28004', '28010', '28046'] },
  { city: 'Barcelona', country: 'Spain', countryCode: 'ES', state: 'Catalonia', flag: '🇪🇸', postalCodes: ['08007', '08008', '08001', '08021'] },
  { city: 'Valencia', country: 'Spain', countryCode: 'ES', state: 'Valencian Community', flag: '🇪🇸', postalCodes: ['46001', '46002', '46004'] },
  { city: 'Seville', country: 'Spain', countryCode: 'ES', state: 'Andalusia', flag: '🇪🇸', postalCodes: ['41001', '41002', '41004'] },
  { city: 'Sevilla', country: 'Spain', countryCode: 'ES', state: 'Andalusia', flag: '🇪🇸', postalCodes: ['41001', '41002', '41004'] },
  { city: 'Málaga', country: 'Spain', countryCode: 'ES', state: 'Andalusia', flag: '🇪🇸', postalCodes: ['29001', '29005', '29015'] },

  // Italy
  { city: 'Rome', country: 'Italy', countryCode: 'IT', state: 'Lazio', flag: '🇮🇹', postalCodes: ['00186', '00187', '00198', '00153'] },
  { city: 'Roma', country: 'Italy', countryCode: 'IT', state: 'Lazio', flag: '🇮🇹', postalCodes: ['00186', '00187', '00198', '00153'] },
  { city: 'Milan', country: 'Italy', countryCode: 'IT', state: 'Lombardy', flag: '🇮🇹', postalCodes: ['20121', '20122', '20124', '20129'] },
  { city: 'Milano', country: 'Italy', countryCode: 'IT', state: 'Lombardy', flag: '🇮🇹', postalCodes: ['20121', '20122', '20124', '20129'] },
  { city: 'Florence', country: 'Italy', countryCode: 'IT', state: 'Tuscany', flag: '🇮🇹', postalCodes: ['50122', '50123', '50129'] },
  { city: 'Firenze', country: 'Italy', countryCode: 'IT', state: 'Tuscany', flag: '🇮🇹', postalCodes: ['50122', '50123', '50129'] },
  { city: 'Turin', country: 'Italy', countryCode: 'IT', state: 'Piedmont', flag: '🇮🇹', postalCodes: ['10121', '10122'] },
  { city: 'Naples', country: 'Italy', countryCode: 'IT', state: 'Campania', flag: '🇮🇹', postalCodes: ['80132', '80133'] },

  // United Arab Emirates
  { city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', state: 'Dubai', flag: '🇦🇪', postalCodes: ['DIFC', 'Downtown', 'Business Bay'] },
  { city: 'Abu Dhabi', country: 'United Arab Emirates', countryCode: 'AE', state: 'Abu Dhabi', flag: '🇦🇪', postalCodes: ['Al Maryah', 'Al Reem'] },

  // Japan
  { city: 'Tokyo', country: 'Japan', countryCode: 'JP', state: 'Tokyo', flag: '🇯🇵', postalCodes: ['100-0001', '106-0032', '150-0002'] },
  { city: 'Osaka', country: 'Japan', countryCode: 'JP', state: 'Osaka', flag: '🇯🇵', postalCodes: ['530-0001', '542-0081'] },
  { city: 'Kyoto', country: 'Japan', countryCode: 'JP', state: 'Kyoto', flag: '🇯🇵', postalCodes: ['600-8001', '604-8001'] },

  // Singapore
  { city: 'Singapore', country: 'Singapore', countryCode: 'SG', state: 'Central Region', flag: '🇸🇬', postalCodes: ['018981', '048624', '049481'] },

  // Sweden
  { city: 'Stockholm', country: 'Sweden', countryCode: 'SE', state: 'Stockholm', flag: '🇸🇪', postalCodes: ['111 20', '114 34', '111 52'] },

  // Norway
  { city: 'Oslo', country: 'Norway', countryCode: 'NO', state: 'Oslo', flag: '🇳🇴', postalCodes: ['0150', '0160', '0250'] },

  // Denmark
  { city: 'Copenhagen', country: 'Denmark', countryCode: 'DK', state: 'Capital Region', flag: '🇩🇰', postalCodes: ['1050', '1100', '1200'] },

  // Finland
  { city: 'Helsinki', country: 'Finland', countryCode: 'FI', state: 'Uusimaa', flag: '🇫🇮', postalCodes: ['00100', '00120', '00180'] },

  // Poland
  { city: 'Warsaw', country: 'Poland', countryCode: 'PL', state: 'Masovia', flag: '🇵🇱', postalCodes: ['00-001', '00-020', '00-130'] },

  // Brazil
  { city: 'São Paulo', country: 'Brazil', countryCode: 'BR', state: 'SP', flag: '🇧🇷', postalCodes: ['01310', '04543', '01452'] },
  { city: 'Sao Paulo', country: 'Brazil', countryCode: 'BR', state: 'SP', flag: '🇧🇷', postalCodes: ['01310', '04543', '01452'] },
  { city: 'Rio de Janeiro', country: 'Brazil', countryCode: 'BR', state: 'RJ', flag: '🇧🇷', postalCodes: ['20040', '22041'] },

  // Mexico
  { city: 'Mexico City', country: 'Mexico', countryCode: 'MX', state: 'CDMX', flag: '🇲🇽', postalCodes: ['06600', '11000', '06100'] },
];

/**
 * Normalizes a string by stripping accents and punctuation
 */
function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Checks if a string looks like a postal code rather than a city name
 */
export function isLikelyPostalCode(input: string): boolean {
  const clean = input.trim().toUpperCase();
  if (!clean) return false;

  // Pure digits: 3 to 6 digits (US, DE, FR, AU, CH, IT, ES, etc.)
  if (/^\d{3,6}(-\d{4})?$/.test(clean)) return true;

  // UK style outcodes/incodes: e.g. EC1A, SW1A, W1D, M1, EH1 2AB
  if (/^[A-Z]{1,2}\d[A-Z\d]?(\s?\d[A-Z]{2})?$/.test(clean)) return true;

  // Canadian style: M5V, M5H 1A1
  if (/^[A-Z]\d[A-Z](\s?\d[A-Z]\d)?$/.test(clean)) return true;

  // Japanese style: 100-0001
  if (/^\d{3}-\d{4}$/.test(clean)) return true;

  // Swedish/Czech style: 111 20
  if (/^\d{3}\s\d{2}$/.test(clean)) return true;

  // Polish style: 00-001
  if (/^\d{2}-\d{3}$/.test(clean)) return true;

  // Irish style: D02, D04
  if (/^D\d{2}$/.test(clean)) return true;

  return false;
}

/**
 * Searches local instant city dictionary for autocomplete suggestions
 */
export function searchCitySuggestions(query: string, maxResults = 5): CityPostalInfo[] {
  const clean = normalizeStr(query);
  if (!clean || clean.length < 2) return [];

  const matched = POPULAR_WORLD_CITIES.filter(c => {
    const normCity = normalizeStr(c.city);
    const normCountry = normalizeStr(c.country);
    return normCity.includes(clean) || normCountry.includes(clean);
  });

  // Deduplicate by city + country
  const seen = new Set<string>();
  const deduped: CityPostalInfo[] = [];

  for (const item of matched) {
    const key = `${item.city.toLowerCase()}_${item.country.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
      if (deduped.length >= maxResults) break;
    }
  }

  return deduped;
}

/**
 * Looks up postal codes for a city directly in local cache/dictionary
 */
export function lookupCityPostalCodesLocal(cityQuery: string, preferredCountry?: string): CityPostalInfo | null {
  const clean = normalizeStr(cityQuery);
  if (!clean) return null;

  // Direct exact match
  const exact = POPULAR_WORLD_CITIES.find(c => {
    const cityNorm = normalizeStr(c.city);
    if (cityNorm === clean) {
      if (preferredCountry && preferredCountry !== 'Worldwide / All Countries') {
        return normalizeStr(c.country) === normalizeStr(preferredCountry);
      }
      return true;
    }
    return false;
  });

  if (exact) return exact;

  // Partial match where city starts with clean or clean starts with city
  const partial = POPULAR_WORLD_CITIES.find(c => {
    const cityNorm = normalizeStr(c.city);
    return cityNorm.startsWith(clean) || clean.startsWith(cityNorm);
  });

  return partial || null;
}

/**
 * Universal city postal code resolver: checks local dataset first, then calls backend AI endpoint
 */
export async function resolveCityToPostalCodes(
  cityQuery: string,
  preferredCountry?: string
): Promise<{ city: string; country: string; state?: string; flag?: string; postalCodes: string[]; lat?: number; lng?: number } | null> {
  const trimmed = cityQuery.trim();
  if (!trimmed) return null;

  // 1. Try instant local dictionary
  const localMatch = lookupCityPostalCodesLocal(trimmed, preferredCountry);
  if (localMatch) {
    return {
      city: localMatch.city,
      country: localMatch.country,
      state: localMatch.state,
      flag: localMatch.flag,
      postalCodes: localMatch.postalCodes,
      lat: localMatch.lat,
      lng: localMatch.lng,
    };
  }

  // 2. Query backend API for global dynamic AI discovery (Gemini Grounded Geocoding)
  try {
    const resp = await fetch('/api/find-postal-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: trimmed, country: preferredCountry }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data && Array.isArray(data.postalCodes) && data.postalCodes.length > 0) {
        return {
          city: data.city || trimmed,
          country: data.country || preferredCountry || 'Worldwide',
          state: data.state,
          flag: data.flag || '📍',
          postalCodes: data.postalCodes,
          lat: typeof data.lat === 'number' ? data.lat : undefined,
          lng: typeof data.lng === 'number' ? data.lng : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('City postal code API resolution warning:', err);
  }

  return null;
}
