const TIME_ZONES = [
  // --- Global / Reference ---
  { label: "Universal Time (UTC)", id: "UTC" }, { label: "Greenwich Mean Time (GMT)", id: "Etc/GMT" },
  // --- Asia ---
  { label: "India (IST)", id: "Asia/Kolkata" }, { label: "Dubai (GST)", id: "Asia/Dubai" }, { label: "Tokyo (JST)", id: "Asia/Tokyo" },
  { label: "Singapore (SGT)", id: "Asia/Singapore" }, { label: "Hong Kong (HKT)", id: "Asia/Hong_Kong" }, { label: "Shanghai (CST)", id: "Asia/Shanghai" },
  { label: "Seoul (KST)", id: "Asia/Seoul" }, { label: "Bangkok (ICT)", id: "Asia/Bangkok" }, { label: "Jakarta (WIB)", id: "Asia/Jakarta" },
  { label: "Manila (PHT)", id: "Asia/Manila" }, { label: "Karachi (PKT)", id: "Asia/Karachi" }, { label: "Dhaka (BST)", id: "Asia/Dhaka" },
  { label: "Kathmandu (NPT)", id: "Asia/Kathmandu" }, { label: "Colombo (IST)", id: "Asia/Colombo" }, { label: "Yangon (MMT)", id: "Asia/Yangon" },
  { label: "Riyadh (AST)", id: "Asia/Riyadh" }, { label: "Tehran (IRST)", id: "Asia/Tehran" }, { label: "Jerusalem (IST)", id: "Asia/Jerusalem" },
  { label: "Kabul (AFT)", id: "Asia/Kabul" }, { label: "Tashkent (UZT)", id: "Asia/Tashkent" }, { label: "Almaty (ALMT)", id: "Asia/Almaty" },
  { label: "Ho Chi Minh (ICT)", id: "Asia/Ho_Chi_Minh" }, { label: "Taipei (CST)", id: "Asia/Taipei" }, { label: "Kuala Lumpur (MYT)", id: "Asia/Kuala_Lumpur" },
  // --- North America ---
  { label: "New York (EST)", id: "America/New_York" }, { label: "Chicago (CST)", id: "America/Chicago" }, { label: "Denver (MST)", id: "America/Denver" },
  { label: "Los Angeles (PST)", id: "America/Los_Angeles" }, { label: "Phoenix (MST)", id: "America/Phoenix" }, { label: "Anchorage (AKST)", id: "America/Anchorage" },
  { label: "Honolulu (HST)", id: "Pacific/Honolulu" }, { label: "Toronto (EST)", id: "America/Toronto" }, { label: "Vancouver (PST)", id: "America/Vancouver" },
  { label: "Mexico City (CST)", id: "America/Mexico_City" }, { label: "Halifax (AST)", id: "America/Halifax" }, { label: "St. John's (NST)", id: "America/St_Johns" },
  // --- South America ---
  { label: "São Paulo (BRT)", id: "America/Sao_Paulo" }, { label: "Buenos Aires (ART)", id: "America/Argentina/Buenos_Aires" }, { label: "Santiago (CLT)", id: "America/Santiago" },
  { label: "Bogota (COT)", id: "America/Bogota" }, { label: "Lima (PET)", id: "America/Lima" }, { label: "Caracas (VET)", id: "America/Caracas" },
  // --- Europe ---
  { label: "London (GMT/BST)", id: "Europe/London" }, { label: "Berlin (CET)", id: "Europe/Berlin" }, { label: "Paris (CET)", id: "Europe/Paris" },
  { label: "Rome (CET)", id: "Europe/Rome" }, { label: "Madrid (CET)", id: "Europe/Madrid" }, { label: "Amsterdam (CET)", id: "Europe/Amsterdam" },
  { label: "Moscow (MSK)", id: "Europe/Moscow" }, { label: "Istanbul (TRT)", id: "Europe/Istanbul" }, { label: "Kyiv (EET)", id: "Europe/Kyiv" },
  { label: "Athens (EET)", id: "Europe/Athens" }, { label: "Helsinki (EET)", id: "Europe/Helsinki" }, { label: "Dublin (IST)", id: "Europe/Dublin" }, { label: "Zurich (CET)", id: "Europe/Zurich" },
  // --- Australia & Oceania ---
  { label: "Sydney (AEST)", id: "Australia/Sydney" }, { label: "Melbourne (AEST)", id: "Australia/Melbourne" }, { label: "Brisbane (AEST)", id: "Australia/Brisbane" },
  { label: "Perth (AWST)", id: "Australia/Perth" }, { label: "Adelaide (ACST)", id: "Australia/Adelaide" }, { label: "Auckland (NZST)", id: "Pacific/Auckland" }, { label: "Fiji (FJT)", id: "Pacific/Fiji" },
  // --- Africa ---
  { label: "Cairo (EET)", id: "Africa/Cairo" }, { label: "Johannesburg (SAST)", id: "Africa/Johannesburg" }, { label: "Lagos (WAT)", id: "Africa/Lagos" },
  { label: "Nairobi (EAT)", id: "Africa/Nairobi" }, { label: "Casablanca (WET)", id: "Africa/Casablanca" }, { label: "Accra (GMT)", id: "Africa/Accra" }
];

const CURRENCY_NAMES = {
  AED: "UAE Dirham", AFN: "Afghan Afghani", ALL: "Albanian Lek", AMD: "Armenian Dram", ANG: "Neth. Antillean Guilder",
  AOA: "Angolan Kwanza", ARS: "Argentine Peso", AUD: "Australian Dollar", AWG: "Aruban Florin", AZN: "Azerbaijani Manat",
  BAM: "Bosnia-Herz. Mark", BBD: "Barbadian Dollar", BDT: "Bangladeshi Taka", BGN: "Bulgarian Lev", BHD: "Bahraini Dinar",
  BIF: "Burundian Franc", BMD: "Bermudan Dollar", BND: "Brunei Dollar", BOB: "Bolivian Boliviano", BRL: "Brazilian Real",
  BSD: "Bahamian Dollar", BTN: "Bhutanese Ngultrum", BWP: "Botswanan Pula", BYN: "Belarusian Ruble", BZD: "Belize Dollar",
  CAD: "Canadian Dollar", CDF: "Congolese Franc", CHF: "Swiss Franc", CLF: "Chilean Unit of Account (UF)", CLP: "Chilean Peso",
  CNH: "Chinese Yuan (Offshore)", CNY: "Chinese Yuan", COP: "Colombian Peso", CRC: "Costa Rican Colón", CUP: "Cuban Peso",
  CVE: "Cape Verdean Escudo", CZK: "Czech Koruna", DJF: "Djiboutian Franc", DKK: "Danish Krone", DOP: "Dominican Peso",
  DZD: "Algerian Dinar", EGP: "Egyptian Pound", ERN: "Eritrean Nakfa", ETB: "Ethiopian Birr", EUR: "Euro",
  FJD: "Fijian Dollar", FKP: "Falkland Islands Pound", FOK: "Faroese Króna", GBP: "British Pound", GEL: "Georgian Lari",
  GGP: "Guernsey Pound", GHS: "Ghanaian Cedi", GIP: "Gibraltar Pound", GMD: "Gambian Dalasi", GNF: "Guinean Franc",
  GTQ: "Guatemalan Quetzal", GYD: "Guyanaese Dollar", HKD: "Hong Kong Dollar", HNL: "Honduran Lempira", HRK: "Croatian Kuna",
  HTG: "Haitian Gourde", HUF: "Hungarian Forint", IDR: "Indonesian Rupiah", ILS: "Israeli New Shekel", IMP: "Manx Pound",
  INR: "Indian Rupee", IQD: "Iraqi Dinar", IRR: "Iranian Rial", ISK: "Icelandic Króna", JEP: "Jersey Pound",
  JMD: "Jamaican Dollar", JOD: "Jordanian Dinar", JPY: "Japanese Yen", KES: "Kenyan Shilling", KGS: "Kyrgystani Som",
  KHR: "Cambodian Riel", KID: "Kiribati Dollar", KMF: "Comorian Franc", KRW: "South Korean Won", KWD: "Kuwaiti Dinar",
  KYD: "Cayman Islands Dollar", KZT: "Kazakhstani Tenge", LAK: "Laotian Kip", LBP: "Lebanese Pound", LKR: "Sri Lankan Rupee",
  LRD: "Liberian Dollar", LSL: "Lesotho Loti", LYD: "Libyan Dinar", MAD: "Moroccan Dirham", MDL: "Moldovan Leu",
  MGA: "Malagasy Ariary", MKD: "Macedonian Denar", MMK: "Myanmar Kyat", MNT: "Mongolian Tugrik", MOP: "Macanese Pataca",
  MRU: "Mauritanian Ouguiya", MUR: "Mauritian Rupee", MVR: "Maldivian Rufiyaa", MWK: "Malawian Kwacha", MXN: "Mexican Peso",
  MYR: "Malaysian Ringgit", MZN: "Mozambican Metical", NAD: "Namibian Dollar", NGN: "Nigerian Naira", NIO: "Nicaraguan Córdoba",
  NOK: "Norwegian Krone", NPR: "Nepalese Rupee", NZD: "New Zealand Dollar", OMR: "Omani Rial", PAB: "Panamanian Balboa",
  PEN: "Peruvian Sol", PGK: "Papua New Guinean Kina", PHP: "Philippine Peso", PKR: "Pakistani Rupee", PLN: "Polish Zloty",
  PYG: "Paraguayan Guarani", QAR: "Qatari Rial", RON: "Romanian Leu", RSD: "Serbian Dinar", RUB: "Russian Ruble",
  RWF: "Rwandan Franc", SAR: "Saudi Riyal", SBD: "Solomon Islands Dollar", SCR: "Seychellois Rupee", SDG: "Sudanese Pound",
  SEK: "Swedish Krona", SGD: "Singapore Dollar", SHP: "Saint Helena Pound", SLE: "Sierra Leonean Leone (New)", SLL: "Sierra Leonean Leone",
  SOS: "Somali Shilling", SRD: "Surinamese Dollar", SSP: "South Sudanese Pound", STN: "São Tomé and Príncipe Dobra", SYP: "Syrian Pound",
  SZL: "Swazi Lilangeni", THB: "Thai Baht", TJS: "Tajikistani Somoni", TMT: "Turkmenistani Manat", TND: "Tunisian Dinar",
  TOP: "Tongan Pa'anga", TRY: "Turkish Lira", TTD: "Trinidad and Tobago Dollar", TVD: "Tuvaluan Dollar", TWD: "New Taiwan Dollar",
  TZS: "Tanzanian Shilling", UAH: "Ukrainian Hryvnia", UGX: "Ugandan Shilling", USD: "US Dollar", UYU: "Uruguayan Peso",
  UZS: "Uzbekistani Som", VED: "Venezuelan Digital Bolívar", VES: "Venezuelan Bolívar", VND: "Vietnamese Dong", VUV: "Vanuatu Vatu",
  WST: "Samoan Tala", XAF: "CFA Franc BEAC", XCD: "East Caribbean Dollar", XCG: "Caribbean Guilder", XOF: "CFA Franc BCEAO",
  XPF: "CFP Franc", YER: "Yemeni Rial", ZAR: "South African Rand", ZMW: "Zambian Kwacha", ZWG: "Zimbabwe Gold (ZiG)",
  ZWL: "Zimbabwean Dollar"
};

const CATEGORIES = ["Age", "Currency", "BMI", "Date Calc", "Time Zone", "Num Sys", "Temperature", "Length", "Area", "Volume", "Weight", "Speed", "Pressure", "Power"];

const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "CNY", "AED", "SGD"];


module.exports = {
  TIME_ZONES, CURRENCY_NAMES, CATEGORIES, MAJOR_CURRENCIES
};