#!/usr/bin/env node
// build-sample-world.js — generates forge/Examples/SampleWorld.trv
// Run: node scripts/build-sample-world.js

const JSZip = require('jszip');
const fs    = require('fs');
const path  = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT       = path.resolve(__dirname, '..');
const FORGE      = path.join(ROOT, 'forge');
const EXAMPLES   = path.join(FORGE, 'Examples');
const MAP_JPG    = path.join(EXAMPLES, 'Example.jpg');
const CAL_JSON   = path.join(EXAMPLES, 'Example_Calendar.json');
const OUT_FILE   = path.join(EXAMPLES, 'SampleWorld.trv');

// ─── IDs ──────────────────────────────────────────────────────────────────────

const MAP_ID        = 'map-aethermoor';
const MAP_IMAGE_KEY = 'img-aethermoor';
const MAP_BANNER    = 'banner-aethermoor';

// Atlas folder IDs
const F_SETTLEMENTS = 'folder-sw-settlements';
const F_RUINS       = 'folder-sw-ruins';
const F_REGIONS     = 'folder-sw-regions';

// Lore folder IDs
const F_WORLD       = 'folder-sw-world';
const F_FACTIONS    = 'folder-sw-factions';
const F_CHARACTERS  = 'folder-sw-characters';
const F_SESSIONS    = 'folder-sw-sessions';
const F_HISTORY     = 'folder-sw-history';

// Article IDs
const A_IRONHOLD    = 'art-sw-ironhold';
const A_SILVERPORT  = 'art-sw-silverport';
const A_TEMPLE      = 'art-sw-temple';
const A_ARCHIVES    = 'art-sw-archives';
const A_VERDANT     = 'art-sw-verdant';
const A_GREY        = 'art-sw-grey';
const A_AETHERMOOR  = 'art-sw-aethermoor';
const A_IRON_ORDER  = 'art-sw-iron-order';
const A_ALDRIC      = 'art-sw-aldric';
const A_MIRA        = 'art-sw-mira';
const A_RIVEN       = 'art-sw-riven';
const A_SESSION1    = 'art-sw-session1';
const A_SUNDERING   = 'art-sw-sundering';
const A_FOUNDING    = 'art-sw-founding';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _blkCounter = 0;
function blkId() { return `blk-sw-${++_blkCounter}`; }

function textBlock(content, visibleToPlayers = true) {
  return { blockId: blkId(), type: 'TextField', visibleToPlayers, data: { content } };
}

function relBlock(links) {
  return { blockId: blkId(), type: 'Relationships', visibleToPlayers: true, data: { links } };
}

function link(targetId, label) {
  return { id: `lnk-sw-${targetId.split('-').pop()}-${label.toLowerCase().replace(/\s+/g,'')}`, targetId, targetType: 'article', linkType: 'family', label };
}

function relLink(targetId, label) {
  return { id: `lnk-sw-rel-${targetId.split('-').pop()}`, targetId, targetType: 'article', linkType: 'related', label };
}

function pointGeoJSON(lng, lat) {
  return { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } };
}

function polygonGeoJSON(rings) {
  // rings: array of [lng, lat] pairs (auto-close)
  const ring = [...rings, rings[0]];
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

// ─── Folders ─────────────────────────────────────────────────────────────────

const folders = [
  // Atlas folders — scoped to MAP_ID
  { id: F_SETTLEMENTS, name: 'Settlements', collapsed: false, parentFolderId: null, mapId: MAP_ID },
  { id: F_RUINS,       name: 'Ruins',       collapsed: false, parentFolderId: null, mapId: MAP_ID },
  { id: F_REGIONS,     name: 'Regions',     collapsed: false, parentFolderId: null, mapId: MAP_ID },
  // Lore folders — mapId: null
  { id: F_WORLD,       name: 'World',       collapsed: false, parentFolderId: null, mapId: null },
  { id: F_FACTIONS,    name: 'Factions',    collapsed: false, parentFolderId: null, mapId: null },
  { id: F_CHARACTERS,  name: 'Characters',  collapsed: false, parentFolderId: null, mapId: null },
  { id: F_SESSIONS,    name: 'Sessions',    collapsed: false, parentFolderId: null, mapId: null },
  { id: F_HISTORY,     name: 'History',     collapsed: false, parentFolderId: null, mapId: null },
];

// ─── Articles ─────────────────────────────────────────────────────────────────

// Map is 1792×2368. Leaflet CRS.Simple bounds [[0,0],[2368,1792]].
// GeoJSON coordinates: [lng=x, lat=y], y=0 at bottom.

const articles = [

  // ── Atlas ─────────────────────────────────────────────────────────────────

  {
    id: A_IRONHOLD,
    _silo: 'atlas',
    name: 'Ironhold Keep',
    type: 'Settlement',
    icon: 'castle',
    iconClass: 'elven-castle',
    color: '#c9aa6e',
    iconColor: '#45283c',
    pinIconColor: '#fbf236',
    geometry: 'point',
    geojson: pointGeoJSON(661.978956, 1516.191976),
    mapId: MAP_ID,
    folderId: F_SETTLEMENTS,
    tags: [],
    links: [relLink(A_IRON_ORDER, 'Seat of Power'), relLink(A_ALDRIC, 'Lord'), { id: 'lnk-sw-terr-ironhold', targetId: A_VERDANT, targetType: 'feature', linkType: 'territory' }],
    blocks: [
      textBlock(
        '## Ironhold Keep\n\nA fortress city carved into the bones of the Ashvane Mountains, Ironhold Keep has stood for four centuries as the seat of the Ashvane line. Its black-iron gates have never fallen to siege.\n\nThe city is arranged in three rings: the Outer Ward (merchants and craftspeople), the Iron District (garrison and armories), and the Inner Citadel (the Ashvane family and their court).'
      ),
      textBlock(
        '**GM Notes:** A hidden vault beneath the Inner Citadel contains relics from the Sundering — including a fragment of the Sundered Stone that the Iron Order would kill to possess.',
        false // GM-only
      ),
    ],
  },

  {
    id: A_SILVERPORT,
    _silo: 'atlas',
    name: 'Silverport',
    type: 'Settlement',
    icon: 'anchor',
    iconClass: 'anchor',
    color: '#6eadc9',
    pinShape: 'marker-alt',
    iconColor: '#639bff',
    geometry: 'point',
    geojson: pointGeoJSON(948.337114, 499.565768),
    mapId: MAP_ID,
    folderId: F_SETTLEMENTS,
    tags: [],
    links: [],
    blocks: [
      textBlock(
        '## Silverport\n\nThe largest free city on the Aethermoor coast, Silverport answers to no lord. Its harbor sees trade from across the known world, and its Merchant Council runs the city with a ruthless efficiency that would make any tyrant envious.\n\nThe Silver Tide Inn near the docks is a legendary gathering place for adventurers, cutpurses, and anyone with a secret to sell.'
      ),
    ],
  },

  {
    id: A_TEMPLE,
    _silo: 'atlas',
    name: 'The Lost Temple',
    type: 'Ruin',
    icon: 'temple',
    iconClass: 'byzantin-temple',
    color: '#a86fa8',
    iconColor: '#4b692f',
    geometry: 'point',
    geojson: pointGeoJSON(340, 1820),
    mapId: MAP_ID,
    folderId: F_RUINS,
    tags: [],
    links: [{ id: 'lnk-sw-terr-temple', targetId: A_VERDANT, targetType: 'feature', linkType: 'territory' }],
    blocks: [
      textBlock(
        '## The Lost Temple\n\nDeep within the Verdant Expanse, this crumbling ruin predates any known civilization on Aethermoor. Its architecture matches no known culture — the stones are etched with a script no scholar has deciphered.'
      ),
      textBlock(
        '**GM Notes:** The temple is actually a prison. Something was sealed here after the Sundering. The seals have been weakening for a generation — locals near the forest edge report strange lights and sounds at night.\n\nThe Iron Order knows about this site and has sent a scout team. They arrive in **3 sessions** unless the players investigate first.',
        false // GM-only
      ),
    ],
  },

  {
    id: A_ARCHIVES,
    _silo: 'atlas',
    name: 'The Sunken Archives',
    type: 'Ruin',
    icon: 'book-open',
    iconClass: 'book-cover',
    color: '#6ea8a8',
    iconColor: '#ac3232',
    geometry: 'point',
    geojson: pointGeoJSON(704.687475, 929.438298),
    mapId: MAP_ID,
    folderId: F_RUINS,
    tags: [],
    links: [relLink(A_SUNDERING, 'Lost in')],
    blocks: [
      textBlock(
        '## The Sunken Archives\n\nLost beneath a shallow inland lake, the Archives were the great library of a civilization that vanished in the Sundering. Salvagers who have dived the ruins describe endless stone shelves — and something that watches from the deep.'
      ),
    ],
  },

  {
    id: A_VERDANT,
    _silo: 'atlas',
    name: 'The Verdant Expanse',
    type: 'Forest',
    icon: 'tree-evergreen',
    color: '#4a9a5f',
    geometry: 'polygon',
    fillOpacity: 0.45,
    coatOfArms: { shield: 'heater', seed: '4c747f21-1cd7-44c8-87b5-77fb6d308811' },
    showCoatOfArms: true,
    geojson: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[501.543008,1250.244098],[429.274563,1334.075494],[354.11538,1345.638445],[413.375505,1413.570784],[443.728252,1461.267957],[404.703292,1490.175335],[364.232963,1442.478162],[247.158082,1506.074393],[208.133122,1482.948491],[154.654472,1415.016153],[98.914674,1421.158694],[62.561418,1443.139733],[58.334295,1458.357375],[95.532976,1495.556056],[109.059769,1534.445586],[88.769579,1557.272049],[98.914674,1646.887053],[118.359439,1675.631488],[143.722176,1673.940639],[171.621187,1691.694555],[172.466611,1721.284414],[180.920857,1736.502057],[163.166941,1755.946822],[159.785243,1809.208569],[181.766281,1834.571306],[195.293075,1872.615412],[213.04699,1880.224233],[235.595131,1881.870307],[255.830295,1874.643463],[273.174722,1896.323996],[307.863576,1913.668423],[381.577389,1899.214734],[424.938456,1925.231374],[485.64395,1964.256334],[524.668911,2059.650682],[686.550227,2010.508139],[787.72605,1896.323996],[852.767651,1822.610182],[799.289001,1737.333417],[774.71773,1693.97235],[750.146459,1617.367799],[797.843633,1559.553043],[738.583508,1471.38554],[647.525267,1442.478162],[581.038298,1461.267957],[614.281782,1381.772668],[659.088218,1300.83201],[628.735471,1243.017254],[501.543008,1250.244098]]] } },
    mapId: MAP_ID,
    folderId: F_REGIONS,
    tags: [],
    links: [],
    blocks: [
      textBlock(
        '## The Verdant Expanse\n\nA vast primordial forest that stretches across the western reaches of Aethermoor. The locals say it predates the world — that the trees remember when the sky was a different color.\n\nTrails into the Expanse tend to shift. Compasses spin. More than one expedition has emerged days later than expected, having traveled in circles.'
      ),
    ],
  },

  {
    id: A_GREY,
    _silo: 'atlas',
    name: 'The Grey Reaches',
    type: 'Mountains',
    icon: 'mountains',
    color: '#9a9aaa',
    geometry: 'polygon',
    fillOpacity: 0.45,
    geojson: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[1254.35853,1480.992268],[1225.601403,1504.955084],[1229.709564,1546.804072],[1230.394257,1585.826686],[1208.484065,1602.260241],[1204.375903,1615.952654],[1207.114678,1646.072977],[1174.934082,1665.243303],[1143.43818,1679.620592],[1126.320842,1704.949335],[1133.167777,1724.803626],[1128.374923,1736.442869],[1128.374923,1756.97985],[1116.050439,1771.357322],[1147.546341,1806.269224],[1185.204485,1799.428845],[1264.628933,1830.230948],[1328.990124,1863.825186],[1390.612541,1904.844512],[1459.081893,1961.664421],[1525.497165,1914.407091],[1552.884906,1929.459968],[1588.488969,1900.027981],[1645.318531,1908.305132],[1693.247077,1853.45498],[1730.220528,1821.960171],[1774.040913,1753.504842],[1771.302139,1720.634636],[1758.977655,1711.70011],[1751.446027,1686.372096],[1761.71643,1651.458554],[1773.356219,1652.138512],[1771.986832,1626.81159],[1756.238881,1632.284403],[1739.806237,1636.3922],[1738.43685,1598.060108],[1762.401123,1562.460416],[1754.184801,1545.342896],[1730.905221,1531.663413],[1702.832787,1548.092779],[1670.652191,1556.989424],[1639.840983,1541.243112],[1630.255274,1522.076975],[1602.182839,1523.44527],[1577.533872,1518.649319],[1579.587953,1485.789858],[1561.101228,1463.884947],[1533.028794,1459.776239],[1511.118601,1446.086193],[1494.001263,1447.455034],[1467.298216,1446.767791],[1450.180878,1426.222979],[1415.946201,1420.744338],[1403.621718,1437.174615],[1397.459476,1452.917648],[1363.2248,1446.759231],[1343.368688,1463.872016],[1284.123189,1463.199395],[1254.35853,1480.992268]]] } },
    mapId: MAP_ID,
    folderId: F_REGIONS,
    tags: [],
    links: [],
    blocks: [
      textBlock(
        "## The Grey Reaches\n\nA forbidding mountain range that forms the eastern spine of Aethermoor. The peaks are perpetually shrouded in cloud, and the passes are controlled by the Iron Order's fortified checkpoints.\n\nDwarven clans who have mined these peaks for generations speak of veins of ore unlike anything found elsewhere — metal that holds enchantment like water holds heat."
      ),
    ],
  },

  // ── Lore ──────────────────────────────────────────────────────────────────

  {
    id: A_AETHERMOOR,
    _silo: 'lore',
    name: 'Aethermoor',
    type: 'World',
    icon: 'globe',
    color: '#ff7a1a',
    geometry: null,
    geojson: null,
    mapId: null,
    folderId: F_WORLD,
    tags: [],
    links: [],
    blocks: [
      textBlock(
        '# Aethermoor — The Shattered Realm\n\nAethermoor is a world still healing from the Sundering — a catastrophic event five centuries ago that fractured the continent, drowned entire civilizations, and left scars in the fabric of reality that have never fully closed.\n\n## The World Today\n\nThe year is **806 by the Angelic Calendar**. The major powers of Aethermoor have maintained an uneasy peace for a generation, but that peace is fraying. Old secrets are surfacing. The seals that were placed after the Sundering are weakening. And someone — or something — seems to be deliberately hastening that process.\n\n## Tone\n\nAethermoor is a world of **dark fantasy**: heroism is real but costly, history is buried rather than forgotten, and the past has a habit of returning with teeth. Inspired by: *The Witcher*, *Dragon Age: Origins*, *The First Law*.'
      ),
      textBlock(
        '## The Angelic Calendar\n\nAethermoor uses the **Angelic Calendar**, named for the nine archangels who are said to have shaped the world. The year is divided into nine months of 43 days each, with a 9-day week.\n\n| Month | Days | Season |\n|---|---|---|\n| Amiel | 43 | Early Spring |\n| Zadkiel | 43 | Late Spring |\n| Pyriel | 43 | Early Summer |\n| Baniel | 43 | High Summer |\n| Kasdiel | 43 | Late Summer |\n| Hielel | 43 | Early Autumn |\n| Azrael | 43 | Late Autumn |\n| Sacha | 43 | Early Winter |\n| Hielik | 43 | Deep Winter |'
      ),
    ],
  },

  {
    id: A_IRON_ORDER,
    _silo: 'lore',
    name: 'The Iron Order',
    type: 'Organization',
    icon: 'shield',
    color: '#c94444',
    geometry: null,
    geojson: null,
    mapId: null,
    folderId: F_FACTIONS,
    tags: ['faction', 'antagonist'],
    links: [relLink(A_IRONHOLD, 'Based in'), relLink(A_ALDRIC, 'Opposed by')],
    blocks: [
      textBlock(
        '## The Iron Order\n\nFounded in year 756, the Iron Order presents itself as a scholarly brotherhood dedicated to preventing another Sundering. In practice, it is a militant organization that believes the only way to prevent catastrophe is to control every relic, seal, and fragment of the old world — by force if necessary.\n\n**Motto:** *"Control is preservation."*\n\n## Structure\n\nThe Order is led by the **Archivists**, seven scholars who hold the titles of the seven fallen academies. Below them are **Wardens** (field operatives), **Scribes** (researchers), and **Irons** (foot soldiers).\n\n## Current Goals\n\nThe Order is aggressively collecting artifacts from the Sundering era. They believe the seals on the Lost Temple are failing and want to either reinforce them — or break them to claim what is inside.'
      ),
    ],
  },

  {
    id: A_ALDRIC,
    _silo: 'lore',
    name: 'Lord Aldric Ashvane',
    type: 'Person',
    icon: 'person',
    color: '#c9aa6e',
    geometry: null,
    geojson: null,
    mapId: null,
    folderId: F_CHARACTERS,
    tags: ['deceased', 'npc'],
    links: [
      link(A_MIRA,  'Daughter'),
      link(A_RIVEN, 'Son'),
      relLink(A_IRONHOLD,  'Lord of'),
      relLink(A_IRON_ORDER, 'Opposed'),
    ],
    blocks: [
      textBlock(
        '## Lord Aldric Ashvane\n\n*Deceased. Lord of Ironhold Keep. Former head of House Ashvane.*\n\nAldric Ashvane was a pragmatic ruler who spent thirty years holding the line against the Iron Order\'s encroachment into the free territories. He died three winters ago under circumstances that were officially declared "natural causes" — a verdict his children have never accepted.\n\n**Appearance:** A tall man, grey-bearded in his final years, always wearing the Ashvane signet ring — a black iron castle on a field of gold.\n\n**Legacy:** Aldric left two things behind: his children, and an encoded journal that allegedly contains proof of the Iron Order\'s crimes. Neither his daughter nor his son know the other has a piece of the cipher key.'
      ),
      textBlock(
        '**GM Notes:** Aldric was poisoned by a Warden of the Iron Order named **Serath Null**. The poison left no trace a common physician would recognize, but a cleric with *Speak with Dead* or access to the right alchemical tests could confirm it.\n\nHis journal is split: half hidden in the vault beneath Ironhold, half sewn into the lining of his traveling coat — currently in Silverport, sold to a junk merchant by a servant who didn\'t know its value.',
        false // GM-only
      ),
    ],
  },

  {
    id: A_MIRA,
    _silo: 'lore',
    name: 'Lady Mira Ashvane',
    type: 'Person',
    icon: 'person',
    color: '#9a6ec9',
    geometry: null,
    geojson: null,
    mapId: null,
    folderId: F_CHARACTERS,
    tags: ['npc'],
    links: [
      link(A_ALDRIC, 'Father'),
      link(A_RIVEN,  'Brother'),
      relLink(A_IRONHOLD, 'Lady of'),
    ],
    blocks: [
      textBlock(
        '## Lady Mira Ashvane\n\n*Current Lady of Ironhold Keep. Head of House Ashvane.*\n\nMira inherited rule of Ironhold at twenty-six — an age her enemies expected to make her pliable. They were wrong. She has ruled with an iron composure that would have made her father proud, while quietly building a network of informants that reaches into the Iron Order itself.\n\nShe is not yet sure the players can be trusted, but she is running out of options.\n\n**Personality:** Measured. Watchful. Occasionally sardonic. Genuinely grieving — she loved her father and has not shown it publicly once.'
      ),
    ],
  },

  {
    id: A_RIVEN,
    _silo: 'lore',
    name: 'Captain Riven Ashvane',
    type: 'Person',
    icon: 'person',
    color: '#c96e6e',
    geometry: null,
    geojson: null,
    mapId: null,
    folderId: F_CHARACTERS,
    tags: ['npc'],
    links: [
      link(A_ALDRIC, 'Father'),
      link(A_MIRA,   'Sister'),
      relLink(A_SILVERPORT, 'Based in'),
    ],
    blocks: [
      textBlock(
        '## Captain Riven Ashvane\n\n*Captain of the *Silver Compass*, a merchant vessel out of Silverport. Younger brother to Lady Mira.*\n\nRiven left Ironhold eight years ago, officially to "pursue maritime trade interests." In truth, he and Mira argued bitterly about whether to openly confront the Iron Order (his position) or maneuver against them from within (hers). He left rather than watch what he considered a slow capitulation.\n\nHe has regretted it ever since — but he is too proud to say so, and too stubborn to come home uninvited.\n\n**What he knows:** He has half a cipher key to his father\'s journal, which he found before he left. He has never told Mira.'
      ),
    ],
  },

  {
    id: A_SESSION1,
    _silo: 'lore',
    name: 'Session 1 — Arrival at Ironhold',
    type: 'Journal',
    icon: 'notebook',
    color: '#6e8dc9',
    geometry: null,
    geojson: null,
    mapId: null,
    folderId: F_SESSIONS,
    tags: ['session'],
    links: [
      relLink(A_IRONHOLD,   'Location'),
      relLink(A_MIRA,       'Key NPC'),
      relLink(A_IRON_ORDER, 'Antagonist'),
    ],
    blocks: [
      textBlock(
        '# Session 1 — Arrival at Ironhold\n\n**Date:** 15 Amiel, Year 806\n\n## Summary\n\nThe players arrived in Ironhold Keep via the northern pass, hired as caravan guards. On arrival they were detained at the gate — an Iron Order Warden named **Cassia Vorne** had issued a warrant for one of the merchants in their party.\n\nLady Mira Ashvane intervened personally to release the party, citing "merchant rights." She invited them to dine at the Citadel, where she quietly offered them a job: locate her father\'s missing journal.\n\n## Key Moments\n- Cassia Vorne introduced as a recurring antagonist\n- Party learned the basics of the Aldric situation\n- [[The Sundering of Aethermoor]] mentioned in passing by the court historian\n\n## XP & Rewards\n- **XP:** 150 per player (roleplaying + investigation)\n- **Reward:** 50gp each, lodging at Ironhold for one week'
      ),
    ],
  },

  {
    id: A_SUNDERING,
    _silo: 'lore',
    name: 'The Sundering of Aethermoor',
    type: 'event',
    icon: 'lightning',
    color: '#c94444',
    geometry: null,
    geojson: null,
    mapId: null,
    folderId: F_HISTORY,
    tags: ['historical'],
    links: [
      relLink(A_TEMPLE,   'Created'),
      relLink(A_ARCHIVES, 'Destroyed'),
    ],
    eventData: {
      year: 301,
      era: '',
      month: 'Azrael',
      day: 9,
      endYear: 303,
      endEra: '',
      endMonth: 'Sacha',
      endDay: null,
      color: '#c94444',
      textColor: '#f5e6e6',
      recurrence: null,
    },
    blocks: [
      textBlock(
        '## The Sundering of Aethermoor\n\n*Year 301, Month of Azrael — Year 303, Month of Sacha*\n\nThe Sundering was a catastrophic magical event that fractured the eastern continent, sank the coastal cities of the old empire, and sealed something vast and terrible beneath the earth.\n\nHistorians disagree on cause. The prevailing theory is that the old empire attempted a ritual to "stabilize the aether" — a magical substrate believed to underpin reality — and catastrophically miscalculated. The ritual instead tore the aether in multiple places simultaneously.\n\nThe aftermath lasted two years: earthquakes, floods, a winter that lasted eighteen months, and the complete collapse of the old imperial order. What survived became the patchwork of city-states and petty kingdoms that make up modern Aethermoor.'
      ),
    ],
  },

  {
    id: A_FOUNDING,
    _silo: 'lore',
    name: "The Iron Order's Founding",
    type: 'event',
    icon: 'shield',
    color: '#8b4444',
    geometry: null,
    geojson: null,
    mapId: null,
    folderId: F_HISTORY,
    tags: ['historical', 'faction'],
    links: [relLink(A_IRON_ORDER, 'Founded')],
    eventData: {
      year: 756,
      era: '',
      month: 'Zadkiel',
      day: 1,
      endYear: null,
      endEra: null,
      endMonth: null,
      endDay: null,
      color: '#8b4444',
      textColor: '#f5e6e6',
      recurrence: null,
    },
    blocks: [
      textBlock(
        "## The Iron Order's Founding\n\n*Year 756, 1st of Zadkiel*\n\nThe Iron Order was formally chartered in Ironhold Keep by seven scholars who claimed to have discovered evidence that the Sundering had left \"unhealed wounds\" in the world — and that without intervention, another Sundering was inevitable.\n\nLord Brennan Ashvane (Aldric's grandfather) granted them a charter in exchange for a pledge to share all discoveries with House Ashvane first. That pledge has been honored in letter and violated in spirit ever since.\n\nBy year 780, the Order had grown from a scholarly brotherhood to a paramilitary organization with operations across the continent. The current Archivists have never publicly explained how a research institution acquired an army."
      ),
    ],
  },

];

// ─── Post-process articles ───────────────────────────────────────────────────
// Atlas features must have `title` — that's what panels.js uses for display.
// Lore entries use `name`. Also backfill `featureType` so migration is a no-op.
articles.forEach(a => {
  if (a._silo === 'atlas') {
    a.title = a.title || a.name;
    if (!a.featureType) {
      if (a.geometry === 'point')    a.featureType = 'generic-pin';
      if (a.geometry === 'polygon')  a.featureType = 'generic-area';
      if (a.geometry === 'polyline') a.featureType = 'generic-line';
    }
    // Polygons default showLabel to true (same as migrateState)
    if (a.geometry === 'polygon' && a.showLabel === undefined) a.showLabel = true;
    // Default label style: 'outline' gives a dark pill background so white text is legible
    // (undefined → map.js falls back to 'none' = transparent background → invisible on light maps)
    if (!a.labelStyle) a.labelStyle = 'outline';
    if (!a.labelColor) a.labelColor = '#ffffff';
    // Default visibility
    if (a.visibleToPlayers === undefined) a.visibleToPlayers = true;
  } else {
    // Lore: ensure name is canonical
    if (!a.name && a.title) a.name = a.title;
    if (a.visibleToPlayers === undefined) a.visibleToPlayers = true;
  }
});

// ─── Calendar ────────────────────────────────────────────────────────────────

const donjonCalendar = JSON.parse(fs.readFileSync(CAL_JSON, 'utf8'));

// ─── Settings ────────────────────────────────────────────────────────────────

const settings = {
  projectName:       'Aethermoor — The Shattered Realm',
  worldId:           'sample-world-aethermoor-v1',
  globalMarkerSize:  40,
  freeMoveEnabled:   false,
  labelsVisible:     true,
  overlayVisible:    false,
  featureClickAction: 'content',
  currentDate:       { year: 806, month: 'Amiel', day: 15 },
  diceColor:         '#ff7a1a',
  diceTheme:         'default',
  donjonCalendar,
};

// ─── Maps ────────────────────────────────────────────────────────────────────

const maps = [
  {
    id:              MAP_ID,
    name:            'Aethermoor',
    parentId:        null,
    folderId:        null,
    imageKey:        MAP_IMAGE_KEY,
    width:           1792,
    height:          2368,
    overlayKey:      null,
    overlayOpacity:  0.4,
    scale:           { pixels: 100, distance: 10, unit: 'miles' },
    grid:            { enabled: false, type: 'square', size: 50, color: '#FFFFFF', opacity: 0.5, width: 1 },
    fog:             { enabled: false, opacity: 1.0, mask: null },
  },
];

// ─── Assemble world.json ─────────────────────────────────────────────────────

const worldJson = {
  settings,
  state: {
    articles,
    features:           [],   // backward-compat (populated by syncArticleViews on load)
    encyclopedia:       [],   // backward-compat
    maps,
    activeMapId:        MAP_ID,
    folders,
    encyclopediaFolders: [],  // migrated into folders above
    templates:          [],
    layoutTemplates:    [],
    customColors:       [],
    appVersion:         '0.5.0-alpha',
  },
};

// ─── Build ZIP ────────────────────────────────────────────────────────────────

async function build() {
  console.log('[build-sample-world] Reading map image...');
  const mapImageData = fs.readFileSync(MAP_JPG);
  console.log(`  Map image: ${(mapImageData.length / 1024 / 1024).toFixed(1)} MB`);

  const zip = new JSZip();

  zip.file('world.json', JSON.stringify(worldJson, null, 2));
  zip.file(MAP_IMAGE_KEY, mapImageData);

  console.log('[build-sample-world] Compressing...');
  const content = await zip.generateAsync({
    type:               'nodebuffer',
    compression:        'DEFLATE',
    compressionOptions: { level: 6 },
  });

  fs.writeFileSync(OUT_FILE, content);
  const sizeMB = (content.length / 1024 / 1024).toFixed(2);
  console.log(`[build-sample-world] Done! → ${OUT_FILE} (${sizeMB} MB)`);
  console.log(`  Articles: ${articles.length}`);
  console.log(`  Maps:     ${maps.length}`);
  console.log(`  Folders:  ${folders.length}`);
}

build().catch(err => {
  console.error('[build-sample-world] FAILED:', err);
  process.exit(1);
});
