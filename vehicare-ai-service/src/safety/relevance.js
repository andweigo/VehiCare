import { isContextDependentFollowUp, normalizeText } from '../utils/symptom-normalizer.js';

/**
 * Deterministic relevance gate for VehiCare AI.
 *
 * It runs BEFORE any model call so an unrelated request is never answered, and
 * AFTER the model call so an "answer, then disclaim" response is never shown.
 *
 * It is intentionally conservative about trust: a claim such as "I need this to
 * fix my motorcycle" is NOT evidence that a question is relevant. Such
 * justification clauses are stripped before evidence is counted.
 */

export const RELEVANCE_VERDICT = Object.freeze({
  RELEVANT: 'relevant',
  UNRELATED: 'unrelated',
  INJECTION: 'injection',
  MIXED: 'mixed',
  UNCERTAIN: 'uncertain',
});

// ---------------------------------------------------------------------------
// Vehicle-domain evidence
// ---------------------------------------------------------------------------

// Whole words (optional plural). Generic verbs such as fix/repair/replace are
// deliberately absent: on their own they prove nothing ("fix my laptop").
const EXACT_VEHICLE_WORDS = [
  'car', 'auto', 'automobile', 'vehicle', 'bike', 'moto', 'motor', 'van', 'bus', 'suv', 'sedan', 'truck', 'pickup',
  'jeepney', 'tricycle', 'trike', 'scooter', 'moped', 'hatchback', 'coupe', 'mpv', 'oil', 'fuel', 'gas', 'gasoline',
  'petrol', 'diesel', 'plug', 'belt', 'chain', 'gear', 'gearbox', 'horn', 'fuse', 'hood', 'axle', 'pad', 'rim', 'fork',
  'tow', 'rpm', 'vin', 'abs', 'ecu', 'tpms', 'clutch', 'brake', 'tire', 'tyre', 'wheel', 'battery', 'engine', 'exhaust',
  'muffler', 'radiator', 'coolant', 'suspension', 'shock', 'steering', 'throttle', 'ignition', 'starter', 'alternator',
  'carburetor', 'carb', 'injector', 'piston', 'cylinder', 'gasket', 'valve', 'turbo', 'caliper', 'rotor', 'chassis',
  'bumper', 'windshield', 'wiper', 'mirror', 'odometer', 'mileage', 'speedometer', 'dashboard', 'headlight', 'taillight',
  'bulb', 'sprocket', 'pedal', 'derailleur', 'spoke', 'handlebar', 'tube', 'tread', 'psi', 'torque', 'lubricant',
  'noise', 'squeak', 'squeal', 'grind', 'knock', 'rattle', 'whine', 'vibration', 'vibrate', 'shake', 'wobble', 'smoke',
  'leak', 'overheat', 'stall', 'misfire', 'idle', 'skid', 'puncture', 'flat', 'jumpstart', 'immobilizer', 'mechanic',
  'maintenance', 'garage', 'vehicare',
  // Brands / common models
  'yamaha', 'honda', 'toyota', 'kawasaki', 'suzuki', 'vespa', 'bmw', 'nissan', 'ford', 'hyundai', 'kia', 'mitsubishi',
  'mazda', 'isuzu', 'subaru', 'ducati', 'ktm', 'harley', 'aerox', 'nmax', 'sniper', 'raider', 'vios', 'civic', 'hilux',
  'xmax', 'pcx', 'tmax', 'ninja', 'fazzio', 'mio', 'rusi', 'skygo', 'keeway', 'benelli', 'royal', 'enfield',
  // Filipino
  'kotse', 'sasakyan', 'makina', 'preno', 'gulong', 'ilaw', 'baterya', 'langis', 'kadena', 'ingay', 'usok', 'tagas',
  'umaandar', 'bisikleta', 'karburador', 'manibela', 'tambutso',
  // Other common languages (language-switch protection)
  'coche', 'motocicleta', 'freno', 'frenos', 'aceite', 'llanta', 'neumatico', 'voiture', 'moteur', 'frein', 'bremse',
  'motorrad', 'reifen', 'moteur', 'carro',
];

const EXACT_VEHICLE_RE = new RegExp(`(?:^|\\s)(?:${EXACT_VEHICLE_WORDS.join('|')})(?:s|es|ing|ed)?(?=\\s|$)`, 'u');

// Prefix stems that are unambiguous.
const STEM_VEHICLE_RE = /(?:^|\s)(?:brak|vibrat|overheat|acceler|steer|lubric|carbur|suspens|transmis|mechanic|motorcycl|motorbik|bicycl|tyre|tire|engine|exhaust|radiat|gearbox|drivetrain|headlight|taillight|sparkplug|crankshaft|camshaft|alternator|odomet|speedomet|dipstick|windshield|handlebar|derailleur|sprocket|diagnos|dyno|tuneup|oilchange)/u;

const VEHICLE_PHRASE_RE = /\b(?:check engine|spark plug|oil change|tune[- ]?up|flat tire|brake pad|license plate|jump start|warning light|engine light|repair\s+(?:cost|shop|history|guide|estimate)s?|\d{1,2}w[- ]?\d{2}|\d{3}\/\d{2}\s?r?\d{2})\b/iu;

const hasVehicleEvidence = (rawText, normText, identityTokens = []) => {
  if (!normText) return false;
  if (EXACT_VEHICLE_RE.test(` ${normText}`) || STEM_VEHICLE_RE.test(` ${normText}`)) return true;
  if (VEHICLE_PHRASE_RE.test(rawText)) return true;
  return identityTokens.some((tok) => tok && new RegExp(`(?:^|\\s)${tok}(?=\\s|$)`, 'u').test(normText));
};

// ---------------------------------------------------------------------------
// Justification / necessity claims (never trusted as evidence)
// ---------------------------------------------------------------------------

const JUSTIFICATION_PATTERNS = [
  /\b(?:i|we)\s+(?:really\s+|just\s+|absolutely\s+)?(?:need|require|must\s+(?:have|know))\s+(?:to\s+(?:know|learn|find\s+out)(?:\s+(?:it|this|that|the\s+answer|the\s+info(?:rmation)?))?|(?:it|this|that|the\s+answer|the\s+info(?:rmation)?))\s+(?:to|for|so\s+(?:that\s+)?i\s+can|in\s+order\s+to|before\s+i\s+can)\b[^.?!;\n]*/giu,
  /\b(?:it'?s|it\s+is|this\s+is|that\s+is|that'?s)\s+(?:really\s+|absolutely\s+)?(?:necessary|needed|required|essential|important|crucial|part\s+of|relevant|connected)\s+(?:to|for|with)\b[^.?!;\n]*/giu,
  /\b(?:so\s+(?:that\s+)?i\s+can|in\s+order\s+to|to\s+help\s+me|to\s+be\s+able\s+to)\s+(?:fix|repair|diagnose|solve|finish|complete|understand)\b[^.?!;\n]*/giu,
  /\b(?:the\s+)?(?:mechanic|technician|shop|manual|guide)\s+(?:said|told|asked|says|requires|needs)\b[^.?!;\n]*/giu,
  /\b(?:my\s+(?:motorcycle|motor|car|bike|vehicle)|it)\s+(?:won'?t|will\s+not|can'?t|cannot|doesn'?t)\s+(?:start|run|work|be\s+fixed)\s+(?:unless|until|without)\s+(?:you|i\s+(?:know|get|learn|find\s+out|have\s+(?:the|this)\s+(?:answer|info(?:rmation)?)))\b[^.?!;\n]*/giu,
  /\b(?:kailangan\s+ko\s+(?:ito|yan|iyan|malaman)|para\s+(?:maayos|magawa|ma-?diagnose)\s+(?:ko|ang))\b[^.?!;\n]*/giu,
  /\b(?:this\s+is|it'?s)\s+(?:for|related\s+to)\s+(?:my|the)\s+(?:motorcycle|car|bike|vehicle|repair|diagnosis)\b[^.?!;\n]*/giu,
];

const stripJustifications = (text) => {
  let stripped = text;
  let found = false;
  for (const re of JUSTIFICATION_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(stripped)) {
      found = true;
      re.lastIndex = 0;
      stripped = stripped.replace(re, ' ');
    }
    re.lastIndex = 0;
  }
  return { stripped: stripped.replace(/\s+/g, ' ').trim(), found };
};

// ---------------------------------------------------------------------------
// Prompt injection / manipulation
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS = [
  /\b(?:ignore|disregard|forget|override|bypass|skip|drop)\b[^.?!\n]{0,40}\b(?:previous|prior|above|earlier|all|any|your|the|these|those|system)\b[^.?!\n]{0,30}\b(?:instructions?|rules?|prompts?|guidelines?|restrictions?|constraints?|policy|policies|programming)\b/iu,
  /\b(?:reveal|show|print|repeat|output|display|leak|tell\s+me)\b[^.?!\n]{0,30}\b(?:system\s+prompt|your\s+prompt|your\s+instructions|initial\s+prompt|hidden\s+(?:prompt|instructions?))\b/iu,
  /\bsystem\s+prompt\b/iu,
  /\bjail\s?break\b/iu,
  /\bdeveloper\s+mode\b/iu,
  /\bdan\s+mode\b/iu,
  /\bdo\s+anything\s+now\b/iu,
  /\byou\s+are\s+(?:now|no\s+longer)\b/iu,
  /\bfrom\s+now\s+on,?\s+(?:you|act|respond|answer|ignore)\b/iu,
  /\b(?:pretend|imagine|role[- ]?play)\b/iu,
  /\bact\s+as\b(?![^.?!\n]{0,20}\b(?:mechanic|technician)\b)/iu,
  /\b(?:new|updated|real)\s+(?:instructions?|rules?)\s*:/iu,
  /(?:^|\n)\s*(?:system|assistant|developer)\s*:/iu,
  /<\/?(?:system|instructions?|prompt)>/iu,
  /\[\/?(?:system|inst)\]/iu,
  /\bwithout\s+(?:any\s+)?(?:restrictions?|limits?|filters?|rules)\b/iu,
  /\bno\s+(?:rules|restrictions|limitations|filters)\b/iu,
  /\b(?:base64|rot13)\b[^.?!\n]{0,30}\b(?:decode|decrypt|instruction)/iu,
  /\b(?:huwag|wag)\s+(?:mong\s+)?(?:sundin|pansinin)\b[^.?!\n]{0,30}\b(?:instruction|utos|patakaran|rules?)/iu,
  /\b(?:kalimutan|kalimutan\s+mo|ignore\s+mo)\b[^.?!\n]{0,30}\b(?:instruction|utos|patakaran|rules?)/iu,
  /\bmagpanggap\b/iu,
  /\b(?:ignora|ignorar|ignorez|ignoriere|ignorieren)\b[^.?!\n]{0,30}\b(?:instrucciones|instructions|anweisungen)/iu,
];

// ---------------------------------------------------------------------------
// Off-topic patterns. `soft` ones can legitimately appear next to vehicle
// evidence, hard ones cannot.
// ---------------------------------------------------------------------------

const OFF_TOPIC_PATTERNS = [
  { re: /\b(?:capital|population|currency|president|prime\s+minister|national\s+anthem)\s+of\b/iu },
  { re: /\b(?:capital|presidente|poblaci[oó]n)\s+(?:de|ng)\b|\bkabisera\s+ng\b/iu },
  { re: /\bwho\s+(?:is|was|are|were)\s+(?:the\s+)?(?:founder|ceo|author|inventor|king|queen|president|owner)\b/iu },
  { re: /\bwho\s+(?:wrote|invented|discovered|painted|sang|directed|won|founded|created|built)\b/iu },
  { re: /\bwhen\s+(?:was|did)\b[^.?!]{0,40}\b(?:founded|born|invented|die[ds]?|discovered|built)\b/iu },
  { re: /\bhistory\s+of\s+(?!(?:my|your|the|this)\s+(?:vehicle|car|motor|motorcycle|bike|bicycle))/iu, soft: true },
  { re: /\b\d+\s*(?:\+|\*|×|÷|\^|plus|times|multiplied\s+by|divided\s+by)\s*\d+\b/iu },
  { re: /\b(?:square\s+root|derivative|integral|logarithm|polynomial|quadratic|pythagorean)\b/iu },
  { re: /\bsolve\b[^.?!]{0,30}\b(?:equation|problem|puzzle|riddle|sudoku|math)\b/iu },
  { re: /\b(?:write|generate|debug|code)\b[^.?!]{0,30}\b(?:code|script|program|function|app|website|query)\b/iu },
  { re: /\b(?:javascript|python|typescript|html|css|sql|c\+\+|golang|php\s+code|react\s+native)\b/iu },
  { re: /\b(?:bitcoin|ethereum|crypto(?:currency)?|stock\s+market|forex|nft|dividend|invest(?:ing|ment)?\s+in\s+stocks)\b/iu },
  { re: /\b(?:tiktok|instagram|facebook|youtube|netflix|spotify|twitter|snapchat|discord|telegram|whatsapp)\b/iu },
  { re: /\b(?:movie|movies|tv\s+series|anime|k-?pop|celebrity|lyrics|album|concert|horoscope|zodiac)\b/iu },
  { re: /\b(?:nba|fifa|world\s+cup|super\s+bowl|premier\s+league|championship\s+results?|game\s+score)\b/iu },
  { re: /\b(?:recipe|how\s+to\s+(?:cook|bake|fry)|ingredients?\s+(?:for|of))\b/iu },
  { re: /\b(?:write|compose|create)\s+(?:me\s+)?(?:an?\s+)?(?:poem|story|song|essay|letter|speech|joke|haiku|novel)\b/iu },
  { re: /\btell\s+me\s+(?:an?\s+)?(?:joke|story|riddle)\b/iu },
  { re: /\b(?:translate|translation)\b/iu, soft: true },
  { re: /\b(?:definition|meaning)\s+of\b(?![^.?!]{0,25}\b(?:warning|light|symbol|code|sound|noise|indicator|dashboard)\b)/iu, soft: true },
  { re: /\b(?:weather|forecast)\s+(?:in|today|tomorrow|for)\b/iu },
  { re: /\b(?:latest|breaking)\s+news\b/iu },
  { re: /\b(?:homework|thesis|term\s+paper|assignment|quiz|exam\s+answers?)\b/iu },
  { re: /\bexplain\b[^.?!]{0,20}\b(?:quantum|photosynthesis|relativity|black\s+holes?|evolution|blockchain|machine\s+learning)\b/iu },
  { re: /\b(?:meaning\s+of\s+life|girlfriend|boyfriend|dating|relationship\s+advice|election|politics|politician|religion|bible\s+verse)\b/iu },
  { re: /\b(?:headache|fever|cough|rash|diabetes|pregnan\w*|depress\w*|anxiety)\b/iu },
  { re: /\b(?:fastest|most\s+expensive|best[- ]selling|cheapest)\s+(?:car|motorcycle|bike|truck|vehicle)s?\s+(?:in\s+the\s+world|ever|of\s+all\s+time)\b/iu },
  { re: /\btop\s+speed\s+of\b/iu },
  { re: /\bwho\s+(?:invented|built|founded)\s+(?:the\s+)?(?:car|automobile|motorcycle|bicycle)\b/iu },
  { re: /\b(?:f1|formula\s*1|motogp|nascar)\s+(?:results?|standings?|winner|champion|schedule)\b/iu },
  { re: /\bhow\s+tall\s+is\b/iu },
  { re: /\btell\s+me\s+about\s+(?:the\s+)?(?:moon|sun|planet|galaxy|universe|ocean|dinosaurs?)\b/iu },
];

// ---------------------------------------------------------------------------
// Neutral conversational openers (not evidence, not a violation)
// ---------------------------------------------------------------------------

const NEUTRAL_RE = /^(?:hello|hi|hey|yo|good\s+(?:morning|afternoon|evening)|thanks?|thank\s+you|ok(?:ay)?|sige|salamat|kumusta|kamusta|help|what\s+can\s+you\s+do|who\s+are\s+you|how\s+do\s+you\s+work|what\s+is\s+vehicare|ano\s+ang\s+vehicare)(?:\s+\w+){0,4}$/iu;

const PERSUASION_RE = /\b(?:just|please|pls)\s+(?:answer|tell|respond)|answer\s+(?:it|that|the\s+(?:question|earlier|previous|first))|\bi\s+(?:told|said)\s+you\b|\breally\s+(?:need|want)\b|\bcome\s+on\b|\bit'?s\s+(?:necessary|required|important)\b|\bsagutin\s+mo\b|\bsige\s+na\b/iu;

export const SCOPE_REFUSAL_MARKERS = [
  "isn't directly related to your",
  'isn’t directly related to your',
  'hindi direktang konektado',
  'unrelated to vehicare',
  "i'm not sure how that relates to your",
];

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const vehicleNoun = (vehicleContext = {}) => {
  const t = String(vehicleContext?.type || '').toLowerCase().trim();
  if (!t || t === 'unknown' || t === 'vehicle') return 'vehicle';
  if (/motor|scooter|moped/.test(t)) return 'motorcycle';
  if (/bicycle|bike|cycle/.test(t)) return 'bicycle';
  if (/truck|van|pickup|bus/.test(t)) return t.includes('van') ? 'van' : 'truck';
  return 'vehicle';
};

const normLang = (language) => {
  const l = String(language || 'en').toLowerCase();
  if (l.startsWith('fil') || l === 'tl') return 'fil';
  if (l === 'taglish') return 'taglish';
  return 'en';
};

const MESSAGES = {
  unrelated: {
    en: (n) => `That question isn't directly related to your ${n}'s diagnosis, repair, or maintenance. I can help you investigate your ${n}'s issue if you describe its symptoms or provide relevant information.`,
    fil: (n) => `Hindi direktang konektado sa diagnosis, pagkukumpuni, o maintenance ng iyong ${n} ang tanong na iyon. Matutulungan kitang suriin ang problema ng iyong ${n} kung ilalarawan mo ang mga sintomas o magbibigay ka ng kaugnay na impormasyon.`,
    taglish: (n) => `Hindi directly related sa diagnosis, repair, o maintenance ng ${n} mo ang question na 'yon. I can help you investigate ang issue ng ${n} mo kung ide-describe mo ang symptoms o magbibigay ka ng relevant info.`,
  },
  injection: {
    en: (n) => `I can't follow instructions that change how VehiCare works or that aren't about your ${n}. That isn't directly related to your ${n}'s diagnosis, repair, or maintenance. Describe the symptoms or what you'd like to do with your ${n}, and I'll help.`,
    fil: (n) => `Hindi ko masusunod ang mga utos na nagbabago sa paraan ng paggana ng VehiCare o hindi tungkol sa iyong ${n}. Hindi direktang konektado iyon sa diagnosis, pagkukumpuni, o maintenance ng iyong ${n}. Ilarawan ang mga sintomas o ang nais mong gawin sa iyong ${n}, at tutulungan kita.`,
    taglish: (n) => `Hindi ko masusunod ang instructions na nagbabago sa paggana ng VehiCare o hindi tungkol sa ${n} mo. Hindi directly related iyon sa diagnosis, repair, o maintenance ng ${n} mo. I-describe ang symptoms o ang gusto mong gawin sa ${n} mo, at tutulungan kita.`,
  },
  uncertain: {
    en: (n) => `I'm not sure how that relates to your ${n}. Is it connected to a symptom, a repair, or a maintenance task? Tell me how, and I'll help.`,
    fil: (n) => `Hindi ako sigurado kung paano ito konektado sa iyong ${n}. Konektado ba ito sa isang sintomas, pagkukumpuni, o maintenance? Sabihin mo kung paano, at tutulungan kita.`,
    taglish: (n) => `Hindi ako sure kung paano ito related sa ${n} mo. Connected ba ito sa symptom, repair, o maintenance task? Sabihin mo kung paano, at tutulungan kita.`,
  },
  notice: {
    en: () => "I can only help with the vehicle-related part of your message, so I've skipped the unrelated question.",
    fil: () => 'Ang bahaging may kaugnayan lamang sa sasakyan ang matutulungan ko, kaya nilaktawan ko ang hindi kaugnay na tanong.',
    taglish: () => 'Ang vehicle-related na part lang ng message mo ang matutulungan ko, kaya nilaktawan ko ang unrelated na tanong.',
  },
};

const pick = (kind, language, vehicleContext) => MESSAGES[kind][normLang(language)](vehicleNoun(vehicleContext));

// ---------------------------------------------------------------------------
// Segmentation and evaluation
// ---------------------------------------------------------------------------

const SPLIT_RE = /(?<=[.?!;\n])\s+|,\s+(?:and|but|then|also|tapos|pero)\s+|\s+(?:and\s+also|also|then\s+also|plus|by\s+the\s+way|btw|tapos|at\s+saka|pati)\s+/iu;

const splitSegments = (text) =>
  String(text || '')
    .split(SPLIT_RE)
    .map((s) => (s || '').trim())
    .filter(Boolean);

const identityTokensFor = (vehicleContext = {}) => {
  const out = new Set();
  [vehicleContext?.brand, vehicleContext?.model].forEach((value) => {
    normalizeText(String(value || ''))
      .split(' ')
      .filter((tok) => tok.length >= 3 && !['unknown', 'vehicle', 'null', 'undefined'].includes(tok) && !/^\d+$/.test(tok))
      .forEach((tok) => out.add(tok));
  });
  return [...out];
};

const turnText = (turn) => String(turn?.content || turn?.text || '');

const analyzeHistory = (history, identityTokens) => {
  const turns = Array.isArray(history) ? history : [];
  const lastAssistant = [...turns].reverse().find((t) => String(t?.role || '').toLowerCase() !== 'user');
  const lastAssistantText = turnText(lastAssistant).toLowerCase();
  const refusedBefore = SCOPE_REFUSAL_MARKERS.some((m) => lastAssistantText.includes(m));
  const vehicleHistory = turns.some((turn) => {
    const raw = turnText(turn);
    const norm = normalizeText(raw);
    if (String(turn?.role || '').toLowerCase() === 'user') {
      return hasVehicleEvidence(raw, norm, identityTokens);
    }
    return /\b(?:diagnos|maintenance|symptom|step\s*\d|tools?|torque|inspect|replace|brake|engine|tire|oil)\b/iu.test(raw);
  });
  return {
    refusedBefore,
    vehicleHistory,
    lastAssistantAsked: lastAssistantText.includes('?'),
  };
};

const evaluateSegment = (segment, ctx) => {
  const raw = segment;
  const lower = raw.toLowerCase();

  if (INJECTION_PATTERNS.some((re) => re.test(raw))) {
    return { label: 'injection', segment };
  }

  const { stripped, found: hadJustification } = stripJustifications(raw);
  const coreNorm = normalizeText(stripped);
  if (!coreNorm) {
    return { label: hadJustification ? 'justification' : 'neutral', segment };
  }

  // After a refusal, pressure to answer anyway earns no trust.
  if (ctx.refusedBefore && PERSUASION_RE.test(stripped)) {
    return { label: 'unrelated', segment, persistence: true };
  }

  const evidence = hasVehicleEvidence(stripped, coreNorm, ctx.identityTokens);
  const offTopic = OFF_TOPIC_PATTERNS.find(({ re }) => re.test(stripped.toLowerCase()) || re.test(stripped));

  if (offTopic && (!offTopic.soft || !evidence)) {
    return { label: 'unrelated', segment };
  }

  if (evidence) {
    return { label: 'relevant', segment };
  }

  if (NEUTRAL_RE.test(coreNorm) || NEUTRAL_RE.test(lower.trim())) {
    return { label: 'neutral', segment };
  }

  const words = coreNorm.split(' ').length;
  const continuation = !ctx.refusedBefore
    && ctx.vehicleHistory
    && (words <= 10 || isContextDependentFollowUp(stripped) || ctx.lastAssistantAsked);
  if (continuation) {
    return { label: 'relevant', segment, continuation: true };
  }

  if (ctx.refusedBefore) {
    // Persistence after a refusal: no new vehicle evidence, so no new trust.
    return { label: 'unrelated', segment, persistence: true };
  }

  return { label: 'unknown', segment, hadJustification };
};

/**
 * @returns {{
 *   verdict: string, relevantText: string, unrelatedSegments: string[],
 *   injection: boolean, reasons: string[]
 * }}
 */
export const evaluateRelevance = ({
  text,
  history = [],
  hasMedia = false,
  vehicleContext = {},
  inputType = 'text',
} = {}) => {
  const raw = String(text || '').trim();
  const reasons = [];

  if (!raw) {
    return {
      verdict: RELEVANCE_VERDICT.RELEVANT,
      relevantText: '',
      unrelatedSegments: [],
      injection: false,
      reasons: ['empty_text'],
    };
  }

  const identityTokens = identityTokensFor(vehicleContext);
  const historyInfo = analyzeHistory(history, identityTokens);
  const ctx = { identityTokens, ...historyInfo };

  const segments = splitSegments(raw);
  const results = segments.map((segment) => evaluateSegment(segment, ctx));
  const labels = results.map((r) => r.label);

  const has = (label) => labels.includes(label);
  const relevantParts = results.filter((r) => r.label === 'relevant' || r.label === 'neutral').map((r) => r.segment);
  const unrelatedSegments = results.filter((r) => r.label === 'unrelated' || r.label === 'injection').map((r) => r.segment);
  const injection = has('injection');

  if (injection) reasons.push('injection_pattern');
  if (has('unrelated')) reasons.push('off_topic_pattern');
  if (results.some((r) => r.persistence)) reasons.push('persistence_after_refusal');

  const base = { unrelatedSegments, injection, reasons };

  if (has('relevant')) {
    if (injection || has('unrelated')) {
      return { ...base, verdict: RELEVANCE_VERDICT.MIXED, relevantText: relevantParts.join(' ') };
    }
    return { ...base, verdict: RELEVANCE_VERDICT.RELEVANT, relevantText: raw };
  }

  if (injection) {
    if (hasMedia) {
      return { ...base, verdict: RELEVANCE_VERDICT.MIXED, relevantText: '' };
    }
    return { ...base, verdict: RELEVANCE_VERDICT.INJECTION, relevantText: '' };
  }

  if (has('unrelated')) {
    if (hasMedia) {
      return { ...base, verdict: RELEVANCE_VERDICT.MIXED, relevantText: '' };
    }
    return { ...base, verdict: RELEVANCE_VERDICT.UNRELATED, relevantText: '' };
  }

  if (hasMedia) {
    // Media-only or media + neutral text: the media itself drives the request.
    return { ...base, verdict: RELEVANCE_VERDICT.RELEVANT, relevantText: raw };
  }

  if (has('unknown') || has('justification')) {
    // A necessity claim ("I need it to fix my motorcycle") attached to content with
    // no vehicle evidence is a manipulation signal, not a reason to answer.
    const claimedNecessity = has('justification') || results.some((r) => r.hadJustification);
    if (claimedNecessity && has('unknown')) {
      reasons.push('unsupported_necessity_claim');
      return { ...base, verdict: RELEVANCE_VERDICT.UNRELATED, relevantText: '' };
    }
    reasons.push(has('justification') && !has('unknown') ? 'justification_only' : 'no_vehicle_evidence');
    return { ...base, verdict: RELEVANCE_VERDICT.UNCERTAIN, relevantText: '' };
  }

  // Only neutral segments (greetings / capability questions).
  void inputType;
  return { ...base, verdict: RELEVANCE_VERDICT.RELEVANT, relevantText: raw };
};

export const buildScopeResponse = (evaluation, { language = 'en', vehicleContext = {} } = {}) => {
  let kind = 'unrelated';
  if (evaluation.verdict === RELEVANCE_VERDICT.INJECTION) kind = 'injection';
  if (evaluation.verdict === RELEVANCE_VERDICT.UNCERTAIN) kind = 'uncertain';

  return {
    type: 'conversation',
    status: 'conversation',
    out_of_scope: evaluation.verdict !== RELEVANCE_VERDICT.UNCERTAIN,
    scope_verdict: evaluation.verdict,
    response: pick(kind, language, vehicleContext),
  };
};

export const buildScopeNotice = ({ language = 'en', vehicleContext = {} } = {}) =>
  pick('notice', language, vehicleContext);

// ---------------------------------------------------------------------------
// Post-model validation
// ---------------------------------------------------------------------------

const RESPONSE_DISCLAIMER_PATTERNS = [
  /\b(?:however|but),?\s+(?:as|since)\s+(?:a|an|the)?\s*(?:vehicare|vehicle|automotive|ai\s+assistant|diagnostic)/iu,
  /\b(?:outside|beyond)\s+(?:of\s+)?(?:my|vehicare'?s|this\s+app'?s)\s+(?:scope|focus|expertise|purpose|capabilities)/iu,
  /\b(?:unrelated|not\s+related|not\s+relevant)\s+to\s+(?:vehicles?|vehicare|your\s+(?:car|motorcycle|bike|bicycle|vehicle)|diagnos|repair)/iu,
  /\bi\s+(?:can|am\s+able\s+to)\s+only\s+(?:assist|help)\s+with\s+(?:vehicle|automotive)/iu,
  /\bmy\s+(?:main|primary)\s+focus\s+is\b/iu,
  /\b(?:hindi|labas)\s+(?:ito\s+)?sa\s+(?:saklaw|scope)\b/iu,
];

const RESPONSE_LEAK_PATTERNS = [
  /\b(?:my|the)\s+(?:system\s+prompt|hidden\s+instructions?|initial\s+instructions?)\b/iu,
  /\bas\s+(?:dan|an\s+unrestricted)\b/iu,
  /\bi\s+(?:have\s+been|am)\s+(?:now\s+)?(?:jailbroken|in\s+developer\s+mode)\b/iu,
];

export const collectResponseText = (data) => {
  if (!data || typeof data !== 'object') return '';
  const parts = [];
  ['response', 'summary', 'whats_happening', 'follow_up_ack', 'diagnostic_progress', 'urgency'].forEach((key) => {
    if (typeof data[key] === 'string') parts.push(data[key]);
  });
  if (Array.isArray(data.recommended_actions)) {
    data.recommended_actions.forEach((a) => typeof a === 'string' && parts.push(a));
  }
  if (Array.isArray(data.clarification_questions)) {
    data.clarification_questions.forEach((q) => {
      if (typeof q === 'string') parts.push(q);
      else if (q && typeof q.question === 'string') parts.push(q.question);
    });
  }
  return parts.join('\n');
};

/**
 * Validates a model response. Returns the original data when it is acceptable,
 * otherwise a deterministic refusal that never contains the model's content.
 */
export const enforceResponseScope = (data, { language = 'en', vehicleContext = {} } = {}) => {
  const text = collectResponseText(data);
  if (data?.type === 'out_of_scope' || data?.status === 'out_of_scope') {
    return {
      replaced: true,
      reason: 'model_flagged_out_of_scope',
      data: buildScopeResponse({ verdict: RELEVANCE_VERDICT.UNRELATED }, { language, vehicleContext }),
    };
  }
  if (RESPONSE_LEAK_PATTERNS.some((re) => re.test(text))) {
    return {
      replaced: true,
      reason: 'prompt_leak',
      data: buildScopeResponse({ verdict: RELEVANCE_VERDICT.INJECTION }, { language, vehicleContext }),
    };
  }
  if (RESPONSE_DISCLAIMER_PATTERNS.some((re) => re.test(text))) {
    return {
      replaced: true,
      reason: 'answer_then_disclaimer',
      data: buildScopeResponse({ verdict: RELEVANCE_VERDICT.UNRELATED }, { language, vehicleContext }),
    };
  }
  return { replaced: false, reason: null, data };
};

// ---------------------------------------------------------------------------
// Language enforcement helper
// ---------------------------------------------------------------------------

const FILIPINO_MARKERS = new Set([
  'ang', 'ng', 'mga', 'yung', 'ko', 'mo', 'po', 'ito', 'iyan', 'lang', 'naman', 'kung', 'dahil', 'pero', 'kasi',
  'hindi', 'ba', 'din', 'rin', 'niya', 'namin', 'natin', 'nang', 'sila', 'kayo', 'tayo', 'sa', 'ay', 'na',
]);
const ENGLISH_MARKERS = new Set([
  'the', 'and', 'is', 'are', 'you', 'your', 'with', 'to', 'of', 'that', 'this', 'it', 'for', 'can', 'will', 'if', 'when', 'be',
  'from', 'by', 'should', 'may', 'have', 'has', 'not', 'or', 'as', 'at', 'on', 'in',
]);

/**
 * True when the response text is clearly in the wrong language for the saved
 * preference. Only `en` and `fil` are enforced; Taglish is intentionally mixed.
 */
export const detectLanguageMismatch = (text, language = 'en') => {
  const lang = normLang(language);
  if (lang === 'taglish') return false;
  const tokens = normalizeText(String(text || '')).split(' ').filter(Boolean);
  if (tokens.length < 8) return false;

  const fil = tokens.filter((t) => FILIPINO_MARKERS.has(t) && !['ay', 'na'].includes(t)).length;
  if (lang === 'en') {
    return fil >= 4 && fil / tokens.length > 0.15;
  }
  const eng = tokens.filter((t) => ENGLISH_MARKERS.has(t)).length;
  return tokens.length >= 10 && fil <= 1 && eng >= 4 && eng / tokens.length >= 0.2;
};
