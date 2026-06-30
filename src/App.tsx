import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { supabase } from './lib/supabase';

type Line = 'GK' | 'DEF' | 'MID' | 'ATT';

type Player = {
  id: string;
  name: string;
  country: string;
  club: string;
  wikiTitle?: string;
  photoUrl?: string;
  line: Line;
  attack: number;
  midfield: number;
  defense: number;
  overall: number;
  cost: number;
};

type SquadPlayer = {
  name: string;
  club: string;
  wikiTitle?: string;
  line: Line;
};

type SquadMap = Record<string, SquadPlayer[]>;
type PhotoMap = Record<string, string | null>;
type LogoMap = Record<number, string | null>;
type ClubMap = Record<string, string | null>;
type Lang = 'en' | 'ru';
type MusicTrack = 'anthem' | 'drums' | 'chant' | 'celebration';
type Edition = 'worldCup' | 'global';
type AuthMode = 'signin' | 'signup';

type Profile = {
  id: string;
  username: string;
};

type LeaderboardEntry = {
  player_id: string;
  username: string;
  club_name: string;
  score: number;
  updated_at: string;
};

type SavedGame = {
  player_id: string;
  username: string;
  year?: number | null;
  edition?: Edition | null;
  countries?: string[] | null;
  selected_ids?: string[] | null;
};

const COIN_BUDGET = 15000;
const MIN_COUNTRIES = 3;
const MAX_COUNTRIES = 5;
const LINE_REQUIREMENTS: Record<Line, number> = {
  GK: 3,
  DEF: 9,
  MID: 8,
  ATT: 8,
};
const REQUIRED_PLAYERS = Object.values(LINE_REQUIREMENTS).reduce((sum, count) => sum + count, 0);

const COPY = {
  en: {
    attack: 'attack',
    budget: 'coin budget',
    chooseCountries: 'Choose at least three countries',
    coins: 'coins',
    coinsLeft: 'coins left',
    countries: 'Countries',
    countryCount: 'countries',
    countryLabel: 'Country',
    draft: 'Player Draft',
    playingFor: 'Playing for',
    loadingPhotos: 'Loading player photos...',
    loadingClubs: 'Loading current clubs...',
    loadingGlobalSquads: 'Loading real national team players...',
    loadingSquads: 'loading squads',
    loadingSquadsLong: 'Loading real World Cup squads...',
    moreNeeded: 'more needed',
    optionalSlots: 'optional slots',
    players: 'players',
    startOver: 'Start over',
    squadLab: 'World Cup squad lab',
    title: 'Build a five-nation 28-man monster.',
    teams: 'teams',
    verdict: 'Verdict',
    worldCup: 'World Cup',
    qualifiedTeams: 'qualified teams',
    language: 'Language',
    musicOff: 'Music off',
    musicOn: 'Music on',
    worldCupEdition: 'World Cup edition',
    globalEdition: 'Not World Cup edition',
    playlist: 'World Cup playlist',
    tracks: {
      anthem: 'Anthem',
      drums: 'Drums',
      chant: 'Chant',
      celebration: 'Celebration',
    },
    incompleteTitle: 'Squad incomplete',
    incompleteText: (count: number) => `Pick ${count} more player${count === 1 ? '' : 's'} to get the verdict.`,
    scaryTitle: 'Scary team, shaky engine',
    scaryText: 'Everything looks good, but that midfield might get cooked when the pressure hits.',
    attackTitle: 'Highlight reel squad',
    attackText: 'The attack is wild, but the defense is giving late equalizer energy.',
    defenseTitle: 'Brick wall, tiny spark',
    defenseText: 'Nobody wants to play through this defense, but goals might need a miracle bounce.',
    midfieldTitle: 'Possession merchants',
    midfieldText: 'The midfield can control the whole game, but the forwards need to finish the story.',
    contenderTitle: 'Trophy contender',
    contenderText: 'Balanced, nasty, and built for knockouts. This multi-country mix can scare anyone.',
    weakTitle: (weakest: string) => `Weak spot: ${weakest}`,
    weakText: (attack: number, midfield: number, defense: number, weakest: string) =>
      `Attack ${attack}, midfield ${midfield}, defense ${defense}. Good squad, but ${weakest} needs one more monster.`,
  },
  ru: {
    attack: 'атака',
    budget: 'бюджет монет',
    chooseCountries: 'Выбери минимум три страны',
    coins: 'монет',
    coinsLeft: 'монет осталось',
    countries: 'Страны',
    countryCount: 'стран',
    countryLabel: 'Страна',
    draft: 'Выбор игроков',
    playingFor: 'Играет за',
    loadingPhotos: 'Загружаем фото игроков...',
    loadingClubs: 'Загружаем нынешние клубы...',
    loadingGlobalSquads: 'Загружаем реальных игроков сборных...',
    loadingSquads: 'загрузка составов',
    loadingSquadsLong: 'Загружаем реальные составы чемпионата мира...',
    moreNeeded: 'еще нужно',
    optionalSlots: 'дополнительных слота',
    players: 'игроков',
    startOver: 'Начать заново',
    squadLab: 'Лаборатория состава ЧМ',
    title: 'Собери монстра из 28 игроков.',
    teams: 'команды',
    verdict: 'Вердикт',
    worldCup: 'Чемпионат мира',
    qualifiedTeams: 'квалифицированных команд',
    language: 'Язык',
    musicOff: 'Музыка выкл',
    musicOn: 'Музыка вкл',
    worldCupEdition: 'Версия ЧМ',
    globalEdition: 'Не версия ЧМ',
    playlist: 'Плейлист ЧМ',
    tracks: {
      anthem: 'Гимн',
      drums: 'Барабаны',
      chant: 'Кричалка',
      celebration: 'Праздник',
    },
    incompleteTitle: 'Состав не готов',
    incompleteText: (count: number) => `Выбери еще ${count} игрок${count === 1 ? 'а' : 'ов'}, чтобы получить вердикт.`,
    scaryTitle: 'Страшная команда, но центр шатается',
    scaryText: 'Все выглядит мощно, но полузащиту могут прожарить под давлением.',
    attackTitle: 'Команда для хайлайтов',
    attackText: 'Атака безумная, но защита пахнет голом на последних минутах.',
    defenseTitle: 'Стена, но мало искры',
    defenseText: 'Через такую защиту тяжело пройти, но голы могут требовать чуда.',
    midfieldTitle: 'Короли владения',
    midfieldText: 'Полузащита может контролировать матч, но нападающим надо закрыть историю.',
    contenderTitle: 'Претендент на кубок',
    contenderText: 'Баланс, мощь и характер для плей-офф. Такой микс стран пугает любого.',
    weakTitle: (weakest: string) => `Слабое место: ${weakest}`,
    weakText: (attack: number, midfield: number, defense: number, weakest: string) =>
      `Атака ${attack}, полузащита ${midfield}, защита ${defense}. Состав хороший, но ${weakest} нужен еще один монстр.`,
  },
};

const WORLD_CUPS: Record<number, string[]> = {
  2002: [
    'Argentina', 'Belgium', 'Brazil', 'Cameroon', 'China PR', 'Costa Rica', 'Croatia',
    'Denmark', 'Ecuador', 'England', 'France', 'Germany', 'Italy', 'Japan', 'Mexico',
    'Nigeria', 'Paraguay', 'Poland', 'Portugal', 'Republic of Ireland', 'Russia',
    'Saudi Arabia', 'Senegal', 'Slovenia', 'South Africa', 'South Korea', 'Spain',
    'Sweden', 'Tunisia', 'Turkey', 'Uruguay', 'United States',
  ],
  2006: [
    'Angola', 'Argentina', 'Australia', 'Brazil', 'Costa Rica', 'Croatia', 'Czech Republic',
    "Cote d'Ivoire", 'Ecuador', 'England', 'France', 'Germany', 'Ghana', 'Iran', 'Italy',
    'Japan', 'Mexico', 'Netherlands', 'Paraguay', 'Poland', 'Portugal', 'Saudi Arabia',
    'Serbia and Montenegro', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Togo',
    'Trinidad and Tobago', 'Tunisia', 'Ukraine', 'United States',
  ],
  2010: [
    'Algeria', 'Argentina', 'Australia', 'Brazil', 'Cameroon', 'Chile', "Cote d'Ivoire",
    'Denmark', 'England', 'France', 'Germany', 'Ghana', 'Greece', 'Honduras', 'Italy',
    'Japan', 'Mexico', 'Netherlands', 'New Zealand', 'Nigeria', 'North Korea', 'Paraguay',
    'Portugal', 'Serbia', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain',
    'Switzerland', 'Uruguay', 'United States',
  ],
  2014: [
    'Algeria', 'Argentina', 'Australia', 'Belgium', 'Bosnia and Herzegovina', 'Brazil',
    'Cameroon', 'Chile', 'Colombia', 'Costa Rica', 'Croatia', "Cote d'Ivoire", 'Ecuador',
    'England', 'France', 'Germany', 'Ghana', 'Greece', 'Honduras', 'Iran', 'Italy',
    'Japan', 'Mexico', 'Netherlands', 'Nigeria', 'Portugal', 'Russia', 'South Korea',
    'Spain', 'Switzerland', 'Uruguay', 'United States',
  ],
  2018: [
    'Argentina', 'Australia', 'Belgium', 'Brazil', 'Colombia', 'Costa Rica', 'Croatia',
    'Denmark', 'Egypt', 'England', 'France', 'Germany', 'Iceland', 'Iran', 'Japan',
    'Mexico', 'Morocco', 'Nigeria', 'Panama', 'Peru', 'Poland', 'Portugal', 'Russia',
    'Saudi Arabia', 'Senegal', 'Serbia', 'South Korea', 'Spain', 'Sweden', 'Switzerland',
    'Tunisia', 'Uruguay',
  ],
  2022: [
    'Argentina', 'Australia', 'Belgium', 'Brazil', 'Cameroon', 'Canada', 'Costa Rica',
    'Croatia', 'Denmark', 'Ecuador', 'England', 'France', 'Germany', 'Ghana', 'Iran',
    'Japan', 'Mexico', 'Morocco', 'Netherlands', 'Poland', 'Portugal', 'Qatar',
    'Saudi Arabia', 'Senegal', 'Serbia', 'South Korea', 'Spain', 'Switzerland', 'Tunisia',
    'United States', 'Uruguay', 'Wales',
  ],
  2026: [
    'Algeria', 'Argentina', 'Australia', 'Austria', 'Belgium', 'Bosnia and Herzegovina',
    'Brazil', 'Cabo Verde', 'Canada', 'Colombia', 'Croatia', 'Curacao', 'Czechia',
    'DR Congo', 'Ecuador', 'Egypt', 'England', 'France', 'Germany', 'Ghana', 'Haiti',
    'Iran', 'Iraq', 'Ivory Coast', 'Japan', 'Jordan', 'Mexico', 'Morocco', 'Netherlands',
    'New Zealand', 'Norway', 'Panama', 'Paraguay', 'Portugal', 'Qatar', 'Saudi Arabia',
    'Scotland', 'Senegal', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland',
    'Tunisia', 'Turkey', 'United States', 'Uruguay', 'Uzbekistan',
  ],
};

const SQUAD_PAGE_TITLES: Record<number, string> = {
  2002: '2002_FIFA_World_Cup_squads',
  2006: '2006_FIFA_World_Cup_squads',
  2010: '2010_FIFA_World_Cup_squads',
  2014: '2014_FIFA_World_Cup_squads',
  2018: '2018_FIFA_World_Cup_squads',
  2022: '2022_FIFA_World_Cup_squads',
  2026: '2026_FIFA_World_Cup_squads',
};

const WORLD_CUP_PAGE_TITLES: Record<number, string> = {
  2002: '2002_FIFA_World_Cup',
  2006: '2006_FIFA_World_Cup',
  2010: '2010_FIFA_World_Cup',
  2014: '2014_FIFA_World_Cup',
  2018: '2018_FIFA_World_Cup',
  2022: '2022_FIFA_World_Cup',
  2026: '2026_FIFA_World_Cup',
};

const WORLD_CUP_THEMES: Record<number, { host: string; vibe: string; colors: string[] }> = {
  2002: {
    host: 'South Korea / Japan',
    vibe: 'neon nights and early-2000s stadium energy',
    colors: ['#2448b8', '#e54335', '#f5d547'],
  },
  2006: {
    host: 'Germany',
    vibe: 'bold black-red-gold tournament atmosphere',
    colors: ['#111111', '#d03a2f', '#f0c94a'],
  },
  2010: {
    host: 'South Africa',
    vibe: 'sunny green, gold, and festival football',
    colors: ['#0d8f58', '#f0b529', '#d84834'],
  },
  2014: {
    host: 'Brazil',
    vibe: 'bright carnival colors and attacking football',
    colors: ['#139b4f', '#f5d33f', '#2468c9'],
  },
  2018: {
    host: 'Russia',
    vibe: 'cool red-blue knockout drama',
    colors: ['#c8323f', '#1d56a5', '#f3f6fb'],
  },
  2022: {
    host: 'Qatar',
    vibe: 'maroon, sand, and night-match pressure',
    colors: ['#7b1238', '#e8c16d', '#1f2937'],
  },
  2026: {
    host: 'Canada / Mexico / United States',
    vibe: 'three-host mega tournament mode',
    colors: ['#1677c8', '#e23d3d', '#19a45b'],
  },
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  'China PR': ['China'],
  "Cote d'Ivoire": ["Cote d'Ivoire", "Côte d'Ivoire", 'Ivory Coast'],
  'Ivory Coast': ["Cote d'Ivoire", "Côte d'Ivoire", 'Ivory Coast'],
  'Czech Republic': ['Czech Republic', 'Czechia'],
  Czechia: ['Czech Republic', 'Czechia'],
  'Republic of Ireland': ['Republic of Ireland', 'Ireland'],
  'Serbia and Montenegro': ['Serbia and Montenegro'],
  'South Korea': ['South Korea', 'Korea Republic'],
  'North Korea': ['North Korea', 'Korea DPR'],
  'United States': ['United States', 'United States of America'],
  Wales: ['Wales'],
};

const COUNTRY_FLAGS: Record<string, string> = {
  Algeria: '🇩🇿',
  Angola: '🇦🇴',
  Argentina: '🇦🇷',
  Australia: '🇦🇺',
  Austria: '🇦🇹',
  Belgium: '🇧🇪',
  'Bosnia and Herzegovina': '🇧🇦',
  Brazil: '🇧🇷',
  'Cabo Verde': '🇨🇻',
  Cameroon: '🇨🇲',
  Canada: '🇨🇦',
  Chile: '🇨🇱',
  'China PR': '🇨🇳',
  Colombia: '🇨🇴',
  'Costa Rica': '🇨🇷',
  Croatia: '🇭🇷',
  Curacao: '🇨🇼',
  'Czech Republic': '🇨🇿',
  Czechia: '🇨🇿',
  "Cote d'Ivoire": '🇨🇮',
  'DR Congo': '🇨🇩',
  Denmark: '🇩🇰',
  Ecuador: '🇪🇨',
  Egypt: '🇪🇬',
  England: '🏴',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Ghana: '🇬🇭',
  Greece: '🇬🇷',
  Haiti: '🇭🇹',
  Honduras: '🇭🇳',
  Iceland: '🇮🇸',
  Iran: '🇮🇷',
  Iraq: '🇮🇶',
  Italy: '🇮🇹',
  'Ivory Coast': '🇨🇮',
  Japan: '🇯🇵',
  Jordan: '🇯🇴',
  Mexico: '🇲🇽',
  Morocco: '🇲🇦',
  Netherlands: '🇳🇱',
  'New Zealand': '🇳🇿',
  Nigeria: '🇳🇬',
  'North Korea': '🇰🇵',
  Norway: '🇳🇴',
  Panama: '🇵🇦',
  Paraguay: '🇵🇾',
  Peru: '🇵🇪',
  Poland: '🇵🇱',
  Portugal: '🇵🇹',
  Qatar: '🇶🇦',
  'Republic of Ireland': '🇮🇪',
  Russia: '🇷🇺',
  'Saudi Arabia': '🇸🇦',
  Scotland: '🏴',
  Senegal: '🇸🇳',
  Serbia: '🇷🇸',
  'Serbia and Montenegro': '🇷🇸',
  Slovakia: '🇸🇰',
  Slovenia: '🇸🇮',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  Spain: '🇪🇸',
  Sweden: '🇸🇪',
  Switzerland: '🇨🇭',
  Togo: '🇹🇬',
  'Trinidad and Tobago': '🇹🇹',
  Tunisia: '🇹🇳',
  Turkey: '🇹🇷',
  Ukraine: '🇺🇦',
  'United States': '🇺🇸',
  Uruguay: '🇺🇾',
  Uzbekistan: '🇺🇿',
  Wales: '🏴',
};

const REGION_NAME_OVERRIDES: Record<string, string> = {
  CD: 'DR Congo',
  CI: 'Ivory Coast',
  CV: 'Cabo Verde',
  CW: 'Curacao',
  CZ: 'Czechia',
  KR: 'South Korea',
  KP: 'North Korea',
  US: 'United States',
};

const FALLBACK_REGION_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BB', 'BD',
  'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BN', 'BO', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ',
  'CA', 'CD', 'CF', 'CG', 'CH', 'CI', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW',
  'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FR', 'GA', 'GB', 'GD', 'GE', 'GH', 'GM', 'GN', 'GQ', 'GR', 'GT', 'GW',
  'GY', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ', 'IR', 'IS', 'IT', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KM', 'KN', 'KP', 'KR', 'KW', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MG', 'MK',
  'ML', 'MM', 'MN', 'MR', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NE', 'NG',
  'NI', 'NL', 'NO', 'NP', 'NZ', 'OM', 'PA', 'PE', 'PG', 'PH', 'PK', 'PL', 'PT', 'PY',
  'QA', 'RO', 'RS', 'RU', 'RW', 'SA', 'SC', 'SD', 'SE', 'SG', 'SI', 'SK', 'SL', 'SM',
  'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SY', 'SZ', 'TD', 'TG', 'TH', 'TJ', 'TL', 'TM',
  'TN', 'TO', 'TR', 'TT', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VN',
  'VU', 'WS', 'YE', 'ZA', 'ZM', 'ZW',
];

function flagFromRegionCode(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function getAllWorldCountries() {
  const supportedValuesOf = (Intl as typeof Intl & {
    supportedValuesOf?: (key: 'region') => string[];
  }).supportedValuesOf;

  let regionCodes = FALLBACK_REGION_CODES;

  if (supportedValuesOf) {
    try {
      regionCodes = supportedValuesOf('region').filter((code) => /^[A-Z]{2}$/.test(code));
    } catch {
      regionCodes = FALLBACK_REGION_CODES;
    }
  }

  const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  return regionCodes
    .map((code) => ({
      code,
      name: REGION_NAME_OVERRIDES[code] ?? displayNames.of(code) ?? code,
      flag: flagFromRegionCode(code),
    }))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
}

const ALL_WORLD_COUNTRIES = getAllWorldCountries();

function ratingFor(country: string, year: number, line: Line, index: number) {
  const seed = [...country].reduce((sum, char) => sum + char.charCodeAt(0), 0) + year + index * 11;
  const base = 68 + (seed % 18);
  const specialty = Math.min(97, base + 9);
  const support = Math.min(92, base + 3);

  if (line === 'ATT') return { attack: specialty, midfield: support, defense: base - 9 };
  if (line === 'MID') return { attack: support, midfield: specialty, defense: support };
  if (line === 'DEF') return { attack: base - 10, midfield: support, defense: specialty };
  return { attack: base - 12, midfield: base - 4, defense: specialty };
}

function playerCost(overall: number) {
  return Math.round((260 + Math.max(0, overall - 70) * 20) / 10) * 10;
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function clubNameForUsername(username: string) {
  return `${username}'s Club`;
}

function squadScore(selectedPlayers: Player[]) {
  if (!selectedPlayers.length) return 0;
  const attack = average(selectedPlayers.map((player) => player.attack));
  const midfield = average(selectedPlayers.map((player) => player.midfield));
  const defense = average(selectedPlayers.map((player) => player.defense));
  const overall = average(selectedPlayers.map((player) => player.overall));
  const completionBonus = selectedPlayers.length === REQUIRED_PLAYERS ? 120 : selectedPlayers.length * 2;
  return Math.round(overall * 10 + attack + midfield + defense + completionBonus);
}

function positionToLine(position: string): Line | null {
  const clean = position.toUpperCase();
  if (clean.includes('GK') || clean.includes('GOALKEEPER')) return 'GK';
  if (clean.includes('DF') || clean.includes('DEFENDER')) return 'DEF';
  if (clean.includes('MF') || clean.includes('MIDFIELDER')) return 'MID';
  if (
    clean.includes('FW')
    || clean.includes('FORWARD')
    || clean.includes('STRIKER')
    || clean.includes('WINGER')
  ) {
    return 'ATT';
  }
  return null;
}

function cleanPlayerName(name: string) {
  return name
    .replace(/\(captain\)/gi, '')
    .replace(/\(vice-captain\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanClubName(name: string) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\[[^\]]+\]/g, '')
    .trim();
}

function titleFromHref(href: string | null) {
  if (!href?.startsWith('/wiki/')) return undefined;
  return decodeURIComponent(href.replace('/wiki/', '')).replace(/_/g, ' ');
}

function findNextSquadTable(heading: Element) {
  let current = heading.parentElement?.nextElementSibling ?? heading.nextElementSibling;

  while (current) {
    const tagName = current.tagName.toLowerCase();
    if (tagName === 'h2' || tagName === 'h3' || current.classList.contains('mw-heading2')) {
      return null;
    }
    if (tagName === 'table' && current.classList.contains('wikitable')) {
      return current;
    }
    const nestedTable = current.querySelector?.('table.wikitable');
    if (nestedTable) return nestedTable;
    current = current.nextElementSibling;
  }

  return null;
}

function parseSquads(html: string): SquadMap {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const squads: SquadMap = {};

  doc.querySelectorAll('h2, h3').forEach((heading) => {
    const country = heading.querySelector('.mw-headline')?.textContent ?? heading.textContent ?? '';
    const key = normalizeName(country.replace(/\[edit\]/gi, ''));
    if (!key) return;

    const table = findNextSquadTable(heading);
    if (!table) return;

    const players = Array.from(table.querySelectorAll('tr.nat-fs-player'))
      .map((row): SquadPlayer | null => {
        const cells = Array.from(row.children);
        const position = cells[1]?.textContent ?? '';
        const nameCell = row.querySelector('th[scope="row"]');
        const clubCell = cells[cells.length - 1];
        const playerLink = nameCell?.querySelector('a');
        const clubLink = clubCell?.querySelector('a:last-of-type');
        const linkName = playerLink?.textContent;
        const name = cleanPlayerName(linkName ?? nameCell?.textContent ?? '');
        const club = cleanClubName(clubLink?.textContent ?? clubCell?.textContent ?? 'Unknown club');
        const line = positionToLine(position);
        if (!name || !line) return null;
        return {
          name,
          club,
          line,
          wikiTitle: playerLink?.getAttribute('title') ?? titleFromHref(playerLink?.getAttribute('href') ?? null),
        };
      })
      .filter((player): player is SquadPlayer => Boolean(player));

    if (players.length >= 15) {
      squads[key] = players;
    }
  });

  return squads;
}

async function loadSquads(year: number) {
  const title = SQUAD_PAGE_TITLES[year];
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${title}&prop=text&format=json&origin=*`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${year} squads`);
  const data = await response.json();
  const html = data?.parse?.text?.['*'];
  if (!html) throw new Error(`No squad data found for ${year}`);
  return parseSquads(html);
}

function normalizeHeader(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\./g, '')
    .trim()
    .toLowerCase();
}

function findHeaderIndex(headers: string[], needles: string[]) {
  return headers.findIndex((header) => needles.some((needle) => header.includes(needle)));
}

function parseNationalTeamPlayers(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const players: SquadPlayer[] = [];
  const seen = new Set<string>();

  doc.querySelectorAll('table.wikitable').forEach((table) => {
    const headerRow = Array.from(table.querySelectorAll('tr')).find((row) => {
      const headers = Array.from(row.children).map((cell) => normalizeHeader(cell.textContent ?? ''));
      return headers.some((header) => header.includes('player'))
        && headers.some((header) => header === 'pos' || header.includes('position'));
    });
    if (!headerRow) return;

    const headers = Array.from(headerRow.children).map((cell) => normalizeHeader(cell.textContent ?? ''));
    const positionIndex = findHeaderIndex(headers, ['pos', 'position']);
    const playerIndex = findHeaderIndex(headers, ['player', 'name']);
    const clubIndex = findHeaderIndex(headers, ['club', 'team']);
    if (positionIndex < 0 || playerIndex < 0) return;

    Array.from(table.querySelectorAll('tr')).forEach((row) => {
      if (row === headerRow) return;
      const cells = Array.from(row.children);
      const position = cells[positionIndex]?.textContent ?? '';
      const line = positionToLine(position);
      if (!line) return;

      const nameCell = cells[playerIndex];
      const playerLink = nameCell?.querySelector('a');
      const name = cleanPlayerName(playerLink?.textContent ?? nameCell?.textContent ?? '');
      if (!name || seen.has(normalizeName(name))) return;

      const clubCell = clubIndex >= 0 ? cells[clubIndex] : cells[cells.length - 1];
      const clubLink = clubCell?.querySelector('a:last-of-type');
      const club = cleanClubName(clubLink?.textContent ?? clubCell?.textContent ?? 'Unknown club');

      seen.add(normalizeName(name));
      players.push({
        name,
        club,
        line,
        wikiTitle: playerLink?.getAttribute('title') ?? titleFromHref(playerLink?.getAttribute('href') ?? null),
      });
    });
  });

  return players;
}

function fallbackNationalTeamTitles(country: string) {
  const special: Record<string, string[]> = {
    Australia: ["Australia men's national soccer team", 'Australia national football team'],
    Canada: ["Canada men's national soccer team", 'Canada national football team'],
    'New Zealand': ["New Zealand men's national football team", 'New Zealand national football team'],
    'South Africa': 'South Africa national soccer team'.split('|'),
    'United States': ["United States men's national soccer team", 'United States national football team'],
  };

  return special[country] ?? [`${country} national football team`, `${country} men's national football team`];
}

async function findNationalTeamTitle(country: string) {
  const searchUrl =
    'https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*' +
    `&srlimit=8&srsearch=${encodeURIComponent(`${country} national football team`)}`;
  const response = await fetch(searchUrl);
  if (!response.ok) return fallbackNationalTeamTitles(country)[0];
  const data = await response.json();
  const results = (data?.query?.search ?? []) as Array<{ title?: string }>;
  const title = results.find((result) => {
    const normalized = normalizeName(result.title ?? '');
    return normalized.includes(normalizeName(country))
      && normalized.includes('national')
      && (normalized.includes('football') || normalized.includes('soccer'));
  })?.title;

  return title ?? fallbackNationalTeamTitles(country)[0];
}

async function loadGlobalSquad(country: string) {
  const title = await findNationalTeamTitle(country);
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${country} national team`);
  const data = await response.json();
  const html = data?.parse?.text?.['*'];
  if (!html) throw new Error(`No national team data found for ${country}`);
  const players = parseNationalTeamPlayers(html);
  if (!players.length) throw new Error(`No real players found for ${country}`);
  return players;
}

async function loadPlayerPhotos(titles: string[]) {
  const uniqueTitles = [...new Set(titles.filter(Boolean))];
  const chunks = Array.from({ length: Math.ceil(uniqueTitles.length / 45) }, (_, index) =>
    uniqueTitles.slice(index * 45, index * 45 + 45),
  );
  const photos: PhotoMap = {};
  uniqueTitles.forEach((title) => {
    photos[title] = null;
  });

  await Promise.all(
    chunks.map(async (chunk) => {
      const url =
        'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&origin=*' +
        `&piprop=thumbnail&pithumbsize=180&titles=${encodeURIComponent(chunk.join('|'))}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      Object.values(data?.query?.pages ?? {}).forEach((page) => {
        const item = page as { title?: string; thumbnail?: { source?: string } };
        if (item.title && item.thumbnail?.source) {
          photos[item.title] = item.thumbnail.source;
        }
      });
    }),
  );

  return photos;
}

async function loadCurrentClubs(titles: string[]) {
  const uniqueTitles = [...new Set(titles.filter(Boolean))];
  const chunks = Array.from({ length: Math.ceil(uniqueTitles.length / 45) }, (_, index) =>
    uniqueTitles.slice(index * 45, index * 45 + 45),
  );
  const clubs: ClubMap = {};
  uniqueTitles.forEach((title) => {
    clubs[title] = null;
  });

  await Promise.all(
    chunks.map(async (chunk) => {
      const pageUrl =
        'https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&props=claims&format=json&origin=*' +
        `&titles=${encodeURIComponent(chunk.join('|'))}`;
      const pageResponse = await fetch(pageUrl);
      if (!pageResponse.ok) return;
      const pageData = await pageResponse.json();
      const entities = Object.values(pageData?.entities ?? {}) as Array<{
        sitelinks?: { enwiki?: { title?: string } };
        claims?: Record<string, Array<{
          mainsnak?: { datavalue?: { value?: { id?: string } } };
          qualifiers?: Record<string, unknown>;
          rank?: string;
        }>>;
      }>;

      const currentClaims = entities
        .map((entity) => {
          const title = entity.sitelinks?.enwiki?.title;
          const claim = entity.claims?.P54?.find((item) => !item.qualifiers?.P582)
            ?? entity.claims?.P54?.find((item) => item.rank === 'preferred')
            ?? entity.claims?.P54?.[0];
          const clubId = claim?.mainsnak?.datavalue?.value?.id;
          return title && clubId ? { title, clubId } : null;
        })
        .filter((item): item is { title: string; clubId: string } => Boolean(item));

      if (!currentClaims.length) return;

      const labelUrl =
        'https://www.wikidata.org/w/api.php?action=wbgetentities&props=labels&languages=en&format=json&origin=*' +
        `&ids=${encodeURIComponent(currentClaims.map((item) => item.clubId).join('|'))}`;
      const labelResponse = await fetch(labelUrl);
      if (!labelResponse.ok) return;
      const labelData = await labelResponse.json();

      currentClaims.forEach(({ title, clubId }) => {
        const label = labelData?.entities?.[clubId]?.labels?.en?.value;
        if (label) clubs[title] = label;
      });
    }),
  );

  return clubs;
}

async function loadWorldCupLogos() {
  const years = Object.keys(WORLD_CUP_PAGE_TITLES).map(Number);
  const titles = years.map((year) => WORLD_CUP_PAGE_TITLES[year]).join('|');
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&origin=*' +
    `&piprop=thumbnail&pithumbsize=220&titles=${encodeURIComponent(titles)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load World Cup logos');

  const data = await response.json();
  const logos: LogoMap = {};
  years.forEach((year) => {
    logos[year] = null;
  });

  Object.values(data?.query?.pages ?? {}).forEach((page) => {
    const item = page as { title?: string; thumbnail?: { source?: string } };
    const year = years.find((candidate) => WORLD_CUP_PAGE_TITLES[candidate] === item.title);
    if (year && item.thumbnail?.source) {
      logos[year] = item.thumbnail.source;
    }
  });

  return logos;
}

function getSquadForCountry(squads: SquadMap, country: string) {
  const names = COUNTRY_ALIASES[country] ?? [country];
  for (const name of names) {
    const squad = squads[normalizeName(name)];
    if (squad) return squad;
  }
  return squads[normalizeName(country)] ?? [];
}

function makePlayers(
  country: string,
  year: number,
  squad: SquadPlayer[],
  photos: PhotoMap,
  currentClubs: ClubMap,
) {
  return squad.map((player, index) => {
    const ratings = ratingFor(country, year, player.line, index);
    const overall = Math.round((ratings.attack + ratings.midfield + ratings.defense) / 3);

    return {
      id: `${year}-${country}-${index}-${player.name}`,
      name: player.name,
      country,
      club: player.wikiTitle ? currentClubs[player.wikiTitle] ?? player.club : player.club,
      wikiTitle: player.wikiTitle,
      photoUrl: player.wikiTitle ? photos[player.wikiTitle] ?? undefined : undefined,
      line: player.line,
      overall,
      cost: playerCost(overall),
      ...ratings,
    };
  });
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function squadRead(selectedPlayers: Player[], lang: Lang) {
  const copy = COPY[lang];

  if (selectedPlayers.length < REQUIRED_PLAYERS) {
    return {
      title: copy.incompleteTitle,
      text: copy.incompleteText(REQUIRED_PLAYERS - selectedPlayers.length),
    };
  }

  const attack = average(selectedPlayers.map((player) => player.attack));
  const midfield = average(selectedPlayers.map((player) => player.midfield));
  const defense = average(selectedPlayers.map((player) => player.defense));
  const weakest = ([
    { key: 'attack', score: attack },
    { key: 'midfield', score: midfield },
    { key: 'defense', score: defense },
  ] as Array<{ key: 'attack' | 'midfield' | 'defense'; score: number }>).sort(
    (a, b) => a.score - b.score,
  )[0].key;

  if (attack >= 83 && defense >= 83 && midfield < 78) {
    return {
      title: copy.scaryTitle,
      text: copy.scaryText,
    };
  }
  if (attack >= 84 && defense < 78) {
    return {
      title: copy.attackTitle,
      text: copy.attackText,
    };
  }
  if (defense >= 84 && attack < 78) {
    return {
      title: copy.defenseTitle,
      text: copy.defenseText,
    };
  }
  if (midfield >= 84 && attack < 80) {
    return {
      title: copy.midfieldTitle,
      text: copy.midfieldText,
    };
  }
  if (attack >= 82 && midfield >= 82 && defense >= 82) {
    return {
      title: copy.contenderTitle,
      text: copy.contenderText,
    };
  }

  const weakestText = lang === 'ru'
    ? { attack: 'атака', midfield: 'полузащите', defense: 'защите' }[weakest]
    : weakest;

  return {
    title: copy.weakTitle(weakestText),
    text: copy.weakText(attack, midfield, defense, weakestText),
  };
}

const MUSIC_TRACKS: MusicTrack[] = ['anthem', 'drums', 'chant', 'celebration'];

function useQuietFootballLoop(enabled: boolean, track: MusicTrack) {
  const audioRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      void audioRef.current?.close();
      audioRef.current = null;
      return;
    }

    const AudioContextClass = window.AudioContext
      || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const master = audio.createGain();
    master.gain.value = 0.045;
    master.connect(audio.destination);
    audioRef.current = audio;

    const playTone = (
      time: number,
      frequency: number,
      duration: number,
      volume: number,
      type: OscillatorType = 'sine',
    ) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.04);
    };

    const playKick = (time: number) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(95, time);
      oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.16);
      gain.gain.setValueAtTime(0.09, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(time);
      oscillator.stop(time + 0.22);
    };

    const patterns: Record<MusicTrack, () => void> = {
      anthem: () => {
        const start = audio.currentTime + 0.05;
        [392, 440, 494, 440, 392, 330].forEach((note, index) => {
          playTone(start + index * 0.32, note, 0.28, 0.026, 'sine');
        });
        playKick(start);
        playKick(start + 1);
      },
      drums: () => {
        const start = audio.currentTime + 0.05;
        [0, 0.34, 0.68, 1.02, 1.36].forEach((offset) => playKick(start + offset));
        [0.17, 0.51, 0.85, 1.19].forEach((offset) => playTone(start + offset, 190, 0.08, 0.018, 'square'));
      },
      chant: () => {
        const start = audio.currentTime + 0.05;
        [0, 0.3, 0.6, 1.05, 1.35].forEach((offset, index) => {
          playTone(start + offset, index % 2 === 0 ? 330 : 392, 0.24, 0.028, 'triangle');
        });
        playKick(start + 0.9);
      },
      celebration: () => {
        const start = audio.currentTime + 0.05;
        [523, 659, 784, 659, 784, 880].forEach((note, index) => {
          playTone(start + index * 0.22, note, 0.18, 0.024, 'sine');
        });
        [0, 0.44, 0.88].forEach((offset) => playKick(start + offset));
      },
    };

    const loop = () => {
      const start = audio.currentTime + 0.05;
      patterns[track]();
      playTone(start + 1.65, 262, 0.08, 0.01, 'sine');
    };

    loop();
    intervalRef.current = window.setInterval(loop, 1800);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      void audio.close();
      audioRef.current = null;
    };
  }, [enabled, track]);
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [playerPassword, setPlayerPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [year, setYear] = useState(2026);
  const [lang, setLang] = useState<Lang>('en');
  const [edition, setEdition] = useState<Edition>('worldCup');
  const [musicOn, setMusicOn] = useState(false);
  const [musicTrack, setMusicTrack] = useState<MusicTrack>('anthem');
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [squadsByYear, setSquadsByYear] = useState<Record<number, SquadMap>>({});
  const [globalSquads, setGlobalSquads] = useState<SquadMap>({});
  const [photos, setPhotos] = useState<PhotoMap>({});
  const [currentClubs, setCurrentClubs] = useState<ClubMap>({});
  const [logos, setLogos] = useState<LogoMap>({});
  const [loadingYear, setLoadingYear] = useState<number | null>(null);
  const [loadingGlobalSquads, setLoadingGlobalSquads] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [squadError, setSquadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState('');

  const qualifiedCountries = WORLD_CUPS[year];
  const availableCountries = edition === 'worldCup'
    ? qualifiedCountries.map((country) => ({ name: country, flag: COUNTRY_FLAGS[country] ?? '🏳️' }))
    : ALL_WORLD_COUNTRIES;
  const squads = squadsByYear[year] ?? {};
  const theme = WORLD_CUP_THEMES[year];
  const themeStyle = {
    '--theme-a': theme.colors[0],
    '--theme-b': theme.colors[1],
    '--theme-c': theme.colors[2],
  } as CSSProperties;
  const selectedLogo = logos[year];
  const playerPool = useMemo(
    () =>
      countries.flatMap((country) => {
        const squad = edition === 'worldCup'
          ? getSquadForCountry(squads, country)
          : globalSquads[country] ?? [];
        return makePlayers(country, year, squad, photos, currentClubs);
      }),
    [countries, currentClubs, edition, globalSquads, photos, squads, year],
  );
  const selectedPlayers = playerPool.filter((player) => selectedIds.includes(player.id));
  const selectedCost = selectedPlayers.reduce((sum, player) => sum + player.cost, 0);
  const coinsLeft = COIN_BUDGET - selectedCost;
  const score = squadScore(selectedPlayers);
  const copy = COPY[lang];
  const read = squadRead(selectedPlayers, lang);
  const lineCounts = selectedPlayers.reduce<Record<Line, number>>(
    (counts, player) => ({ ...counts, [player.line]: counts[player.line] + 1 }),
    { GK: 0, DEF: 0, MID: 0, ATT: 0 },
  );

  useQuietFootballLoop(musicOn, musicTrack);

  async function loadLeaderboard() {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('player_id, username, club_name, score, updated_at')
      .order('score', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(10);

    if (error) {
      setLeaderboardError(error.message);
      return;
    }

    setLeaderboardError('');
    setLeaderboard((data ?? []) as LeaderboardEntry[]);
  }

  function enterPlayer(saved: SavedGame, password: string) {
    setProfile({ id: saved.player_id, username: saved.username });
    setPlayerPassword(password);

    if (saved.year && saved.edition) {
      setYear(saved.year);
      setEdition(saved.edition);
      setCountries(saved.countries ?? []);
      setSelectedIds(saved.selected_ids ?? []);
      setSaveMessage('Saved progress loaded.');
    }
  }

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  useEffect(() => {
    if (squadsByYear[year]) return;

    let active = true;
    setLoadingYear(year);
    setSquadError('');

    loadSquads(year)
      .then((nextSquads) => {
        if (!active) return;
        setSquadsByYear((current) => ({ ...current, [year]: nextSquads }));
      })
      .catch(() => {
        if (!active) return;
        setSquadError(`Could not load ${year} World Cup squads. Check your internet and refresh.`);
      })
      .finally(() => {
        if (active) setLoadingYear(null);
      });

    return () => {
      active = false;
    };
  }, [squadsByYear, year]);

  useEffect(() => {
    if (edition !== 'global') return;

    const missingCountries = countries.filter((country) => globalSquads[country] === undefined);
    if (!missingCountries.length) return;

    let active = true;
    setLoadingGlobalSquads(true);

    Promise.all(
      missingCountries.map(async (country) => {
        try {
          return [country, await loadGlobalSquad(country)] as const;
        } catch {
          return [country, [] as SquadPlayer[]] as const;
        }
      }),
    )
      .then((loadedSquads) => {
        if (!active) return;
        setGlobalSquads((current) => {
          const next = { ...current };
          loadedSquads.forEach(([country, squad]) => {
            next[country] = squad;
          });
          return next;
        });
      })
      .finally(() => {
        if (active) setLoadingGlobalSquads(false);
      });

    return () => {
      active = false;
    };
  }, [countries, edition, globalSquads]);

  useEffect(() => {
    let active = true;

    loadWorldCupLogos()
      .then((nextLogos) => {
        if (active) setLogos(nextLogos);
      })
      .catch(() => {
        if (!active) return;
        setLogos({});
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const missingTitles = playerPool
      .map((player) => player.wikiTitle)
      .filter((title): title is string => Boolean(title && photos[title] === undefined));

    if (!missingTitles.length) return;

    let active = true;
    setLoadingPhotos(true);

    loadPlayerPhotos(missingTitles)
      .then((nextPhotos) => {
        if (!active) return;
        setPhotos((current) => ({ ...current, ...nextPhotos }));
      })
      .finally(() => {
        if (active) setLoadingPhotos(false);
      });

    return () => {
      active = false;
    };
  }, [photos, playerPool]);

  useEffect(() => {
    const missingTitles = playerPool
      .map((player) => player.wikiTitle)
      .filter((title): title is string => Boolean(title && currentClubs[title] === undefined));

    if (!missingTitles.length) return;

    let active = true;
    setLoadingClubs(true);

    loadCurrentClubs(missingTitles)
      .then((nextClubs) => {
        if (!active) return;
        setCurrentClubs((current) => ({ ...current, ...nextClubs }));
      })
      .finally(() => {
        if (active) setLoadingClubs(false);
      });

    return () => {
      active = false;
    };
  }, [currentClubs, playerPool]);

  function changeYear(nextYear: number) {
    setYear(nextYear);
    setCountries([]);
    setSelectedIds([]);
    setSaveMessage('');
  }

  function changeEdition(nextEdition: Edition) {
    setEdition(nextEdition);
    setCountries([]);
    setSelectedIds([]);
    setSaveMessage('');
  }

  function startOver() {
    setCountries([]);
    setSelectedIds([]);
    setSaveMessage('');
  }

  function toggleCountry(country: string) {
    if (countries.includes(country)) {
      setCountries(countries.filter((item) => item !== country));
      setSelectedIds((ids) => ids.filter((id) => !id.startsWith(`${year}-${country}-`)));
      setSaveMessage('');
      return;
    }

    if (countries.length < MAX_COUNTRIES) {
      setCountries([...countries, country]);
      setSaveMessage('');
    }
  }

  function togglePlayer(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
      setSaveMessage('');
      return;
    }

    const player = playerPool.find((item) => item.id === id);
    if (
      player &&
      selectedIds.length < REQUIRED_PLAYERS &&
      lineCounts[player.line] < LINE_REQUIREMENTS[player.line] &&
      selectedCost + player.cost <= COIN_BUDGET
    ) {
      setSelectedIds([...selectedIds, id]);
      setSaveMessage('');
    }
  }

  async function handleAuthSubmit(event: FormEvent) {
    event.preventDefault();
    const username = normalizeUsername(authUsername);
    setAuthMessage('');

    if (username.length < 3) {
      setAuthMessage('Username needs at least 3 letters, numbers, or underscores.');
      return;
    }

    if (authPassword.length < 6) {
      setAuthMessage('Password needs at least 6 characters.');
      return;
    }

    setAuthBusy(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.rpc('register_game_player', {
          p_username: username,
          p_password: authPassword,
        });

        if (error) {
          setAuthMessage(error.message.includes('already')
            ? 'That username is already taken.'
            : error.message);
          return;
        }

        const [createdPlayer] = (data ?? []) as SavedGame[];
        if (createdPlayer) enterPlayer(createdPlayer, authPassword);
      } else {
        const { data, error } = await supabase.rpc('login_game_player', {
          p_username: username,
          p_password: authPassword,
        });

        if (error) {
          setAuthMessage('Wrong username or password.');
          return;
        }

        const [savedPlayer] = (data ?? []) as SavedGame[];
        if (savedPlayer) enterPlayer(savedPlayer, authPassword);
      }
    } catch {
      setAuthMessage('Something went wrong. Try again.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setMusicOn(false);
    setProfile(null);
    setPlayerPassword('');
    setAuthPassword('');
    setCountries([]);
    setSelectedIds([]);
    setSaveMessage('');
  }

  async function saveProgress() {
    if (!profile || !playerPassword) return;
    setSaving(true);
    setSaveMessage('');

    const clubName = clubNameForUsername(profile.username);
    const { error } = await supabase.rpc('save_game_progress', {
      p_player_id: profile.id,
      p_password: playerPassword,
      p_year: year,
      p_edition: edition,
      p_countries: countries,
      p_selected_ids: selectedIds,
      p_score: score,
      p_club_name: clubName,
    });

    if (error) {
      setSaveMessage(error.message);
    } else {
      setSaveMessage('Saved. Your club is on the leaderboard.');
      await loadLeaderboard();
    }

    setSaving(false);
  }

  if (!profile) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-card">
          <p className="eyebrow">World Cup squad lab</p>
          <h1>Register your club.</h1>
          <p className="auth-copy">
            Pick a unique username and password before building your team.
          </p>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Username
              <input
                autoComplete="username"
                minLength={3}
                pattern="[a-zA-Z0-9_]+"
                placeholder="champion_10"
                value={authUsername}
                onChange={(event) => setAuthUsername(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                placeholder="6+ characters"
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={authBusy}>
              {authBusy ? 'Working...' : authMode === 'signup' ? 'Create player' : 'Sign in'}
            </button>
          </form>
          {authMessage && <p className="auth-message">{authMessage}</p>}
          <button
            className="auth-switch"
            onClick={() => {
              setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
              setAuthMessage('');
            }}
            type="button"
          >
            {authMode === 'signup' ? 'Already registered? Sign in' : 'Need a player? Register'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell theme-${year}`} style={themeStyle}>
      <section className="hero">
        {selectedLogo && <img className="hero-logo" src={selectedLogo} alt="" />}
        <div>
          <p className="eyebrow">{year} {copy.squadLab}</p>
          <h1>{copy.title}</h1>
          <p className="hero-copy">{theme.host} / {theme.vibe}</p>
          <div className="lang-toggle" aria-label={copy.language}>
            <button
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
              type="button"
            >
              EN
            </button>
            <button
              className={lang === 'ru' ? 'active' : ''}
              onClick={() => setLang('ru')}
              type="button"
            >
              RU
            </button>
          </div>
          <button
            className={musicOn ? 'music-toggle active' : 'music-toggle'}
            onClick={() => setMusicOn((current) => !current)}
            type="button"
          >
            {musicOn ? copy.musicOn : copy.musicOff}
          </button>
          <div className="edition-toggle">
            <button
              className={edition === 'global' ? 'active' : ''}
              onClick={() => changeEdition('global')}
              type="button"
            >
              {copy.globalEdition}
            </button>
            <button
              className={edition === 'worldCup' ? 'active' : ''}
              onClick={() => changeEdition('worldCup')}
              type="button"
            >
              {copy.worldCupEdition}
            </button>
          </div>
          <div className="playlist" aria-label={copy.playlist}>
            {MUSIC_TRACKS.map((track) => (
              <button
                key={track}
                className={musicTrack === track ? 'active' : ''}
                onClick={() => {
                  setMusicTrack(track);
                  setMusicOn(true);
                }}
                type="button"
              >
                {copy.tracks[track]}
              </button>
            ))}
          </div>
        </div>
        <div className="scoreboard">
          <span>Player: {profile?.username ?? 'loading'}</span>
          <span>{countries.length}/{MAX_COUNTRIES} {copy.countryCount}</span>
          <strong>{selectedPlayers.length}/{REQUIRED_PLAYERS} {copy.players}</strong>
          <span className="score-pill">{score.toLocaleString()} score</span>
          <span className={coinsLeft < 0 ? 'coins danger' : 'coins'}>
            {coinsLeft.toLocaleString()} {copy.coinsLeft}
          </span>
          <button className="save-button" onClick={saveProgress} disabled={saving} type="button">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="start-over" onClick={startOver} type="button">
            {copy.startOver}
          </button>
          <button className="sign-out" onClick={signOut} type="button">
            Sign out
          </button>
          {saveMessage && <span className="save-message">{saveMessage}</span>}
        </div>
      </section>

      <section className="panel year-panel">
        <div className="section-title">
          <h2>{copy.worldCup}</h2>
          <p>
            {loadingYear === year
              ? copy.loadingSquads
              : `${availableCountries.length} ${copy.qualifiedTeams}`}
          </p>
        </div>
        <div className="year-tabs" role="tablist" aria-label="World Cup year">
          {Object.keys(WORLD_CUPS).map((item) => {
            const cupYear = Number(item);
            return (
              <button
                key={cupYear}
                className={cupYear === year ? 'year-choice active' : 'year-choice'}
                onClick={() => changeYear(cupYear)}
                type="button"
              >
                {logos[cupYear] && <img src={logos[cupYear] ?? undefined} alt="" />}
                <span>{cupYear}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="layout">
        <div className="panel">
          <div className="section-title">
            <h2>{copy.countries}</h2>
            <p>
              {countries.length < MIN_COUNTRIES
                ? `${MIN_COUNTRIES - countries.length} ${copy.moreNeeded}`
                : `${MAX_COUNTRIES - countries.length} ${copy.optionalSlots}`}
            </p>
          </div>
          <div className="country-grid">
            {availableCountries.map((country) => {
              const selected = countries.includes(country.name);
              const disabled = !selected && countries.length === MAX_COUNTRIES;
              return (
                <button
                  key={country.name}
                  className={selected ? 'country selected' : 'country'}
                  disabled={disabled}
                  onClick={() => toggleCountry(country.name)}
                  type="button"
                >
                  <span className="country-flag-bg" aria-hidden="true">
                    {country.flag}
                  </span>
                  <span className="country-name">{country.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="panel verdict-panel">
          <div className="section-title">
            <h2>{copy.verdict}</h2>
            <p>{read.title}</p>
          </div>
          <div className="cup-card">
            {selectedLogo && <img src={selectedLogo} alt="" />}
            <span>
              <strong>{year} {copy.worldCup}</strong>
              {theme.host}
            </span>
          </div>
          <p className="verdict-copy">{read.text}</p>
          <div className="line-meter">
            {(['GK', 'DEF', 'MID', 'ATT'] as Line[]).map((line) => (
              <span key={line}>
                <strong>{line}</strong>
                {lineCounts[line]}/{LINE_REQUIREMENTS[line]}
              </span>
            ))}
          </div>
          <div className="leaderboard-card">
            <div className="section-title">
              <h2>Best Clubs</h2>
              <p>Top 10</p>
            </div>
            {leaderboardError && <p className="data-message">{leaderboardError}</p>}
            {!leaderboardError && leaderboard.length === 0 && (
              <p className="leaderboard-empty">Save a team to enter the race.</p>
            )}
            <ol className="leaderboard-list">
              {leaderboard.map((entry, index) => (
                <li key={entry.player_id} className={entry.player_id === profile.id ? 'current' : ''}>
                  <span className="leaderboard-rank">{index + 1}</span>
                  <span>
                    <strong>{entry.club_name}</strong>
                    <em>@{entry.username}</em>
                  </span>
                  <b>{entry.score.toLocaleString()}</b>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </section>

      <section className="panel players-panel">
          <div className="section-title">
            <h2>{copy.draft}</h2>
            <p>
              {countries.length >= MIN_COUNTRIES
                ? `${COIN_BUDGET.toLocaleString()} ${copy.budget}`
                : copy.chooseCountries}
            </p>
          </div>
        {squadError && <p className="data-message">{squadError}</p>}
        {!squadError && loadingYear === year && (
          <p className="data-message">{copy.loadingSquadsLong}</p>
        )}
        {!squadError && loadingGlobalSquads && (
          <p className="data-message">{copy.loadingGlobalSquads}</p>
        )}
        {!squadError && loadingPhotos && (
          <p className="data-message">{copy.loadingPhotos}</p>
        )}
        {!squadError && loadingClubs && (
          <p className="data-message">{copy.loadingClubs}</p>
        )}
        <div className="player-grid">
          {playerPool.map((player) => {
            const selected = selectedIds.includes(player.id);
            const tooExpensive = selectedCost + player.cost > COIN_BUDGET;
            const lineFull = lineCounts[player.line] >= LINE_REQUIREMENTS[player.line];
            const disabled = !selected && (selectedIds.length === REQUIRED_PLAYERS || lineFull || tooExpensive);
            const initials = player.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2);
            return (
              <button
                key={player.id}
                className={selected ? 'player selected' : 'player'}
                disabled={disabled || countries.length < MIN_COUNTRIES}
                onClick={() => togglePlayer(player.id)}
                type="button"
              >
                <span className="player-media">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="player-placeholder">{initials}</span>
                  )}
                  <span className="player-topline">
                    <strong>{player.name}</strong>
                    <em>{player.line}</em>
                  </span>
                </span>
                <span className="player-meta">
                  <span>{copy.countryLabel}: {player.country}</span>
                  <span>{copy.playingFor}: {player.club}</span>
                </span>
                <span className="price-row">
                  <strong>{player.cost.toLocaleString()} {copy.coins}</strong>
                  <em>OVR {player.overall}</em>
                </span>
                <span className="ratings">
                  A {player.attack} / M {player.midfield} / D {player.defense}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
