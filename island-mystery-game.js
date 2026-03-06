// ============================================================================
//  ISLAND MYSTERY: DEATH ON SAINT-HONORÉ
//  A Caribbean Detective Game — Browser Edition
// ============================================================================

// ============================================================================
//  SECTION 1: CORE ENGINE, GAME STATE, INPUT SYSTEM, TITLE SCREEN
// ============================================================================

// --- ANSI Color Helpers ---
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  italic:  '\x1b[3m',
  under:   '\x1b[4m',
  // Foreground
  black:   '\x1b[30m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  // Bright
  bRed:    '\x1b[91m',
  bGreen:  '\x1b[92m',
  bYellow: '\x1b[93m',
  bBlue:   '\x1b[94m',
  bMagenta:'\x1b[95m',
  bCyan:   '\x1b[96m',
  bWhite:  '\x1b[97m',
  // Background
  bgBlack: '\x1b[40m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow:'\x1b[43m',
  bgBlue:  '\x1b[44m',
  bgMagenta:'\x1b[45m',
  bgCyan:  '\x1b[46m',
  bgWhite: '\x1b[47m',
};

function colorize(text, ...styles) {
  return styles.join('') + text + C.reset;
}

// --- Typing Effect (browser) ---
function typeText(text, speed = 20) {
  return Terminal.typeText(text, speed);
}

function printSlow(text, speed = 15) {
  return Terminal.typeLine(text, speed);
}

function print(text = '') {
  Terminal.writeLine(text);
}

function printLine(char = '─', length = 60) {
  print(colorize(char.repeat(length), C.dim, C.cyan));
}

function printDoubleLine(length = 60) {
  print(colorize('═'.repeat(length), C.bold, C.yellow));
}

function printHeader(text) {
  const pad = Math.max(0, Math.floor((58 - text.length) / 2));
  printDoubleLine();
  print(colorize('║' + ' '.repeat(pad) + text + ' '.repeat(58 - pad - text.length) + '║', C.bold, C.yellow));
  printDoubleLine();
}

function printSubHeader(text) {
  print();
  print(colorize(`  ◆ ${text}`, C.bold, C.bCyan));
  printLine('─', 60);
}

function printChoice(num, text, extra = '') {
  const tag = colorize(`  [${num}]`, C.bold, C.bYellow);
  const body = colorize(` ${text}`, C.white);
  const info = extra ? colorize(` ${extra}`, C.dim) : '';
  print(`${tag}${body}${info}`);
}

function printClue(text) {
  print(colorize(`  🔍 ${text}`, C.bGreen));
}

function printEvidence(text) {
  print(colorize(`  📋 ${text}`, C.bYellow));
}

function printDialogue(speaker, text) {
  print(colorize(`  ${speaker}: `, C.bold, C.bCyan) + colorize(`"${text}"`, C.white));
}

function printNarration(text) {
  print(colorize(`  ${text}`, C.italic, C.dim));
}

function printAlert(text) {
  print(colorize(`  ⚠ ${text}`, C.bold, C.bRed));
}

function printSuccess(text) {
  print(colorize(`  ✓ ${text}`, C.bold, C.bGreen));
}

function printLocationArt(art) {
  art.split('\n').forEach(line => {
    print(colorize(line, C.cyan));
  });
}

// --- Input System (browser) ---
async function prompt(question = '') {
  const val = await Terminal.waitForInput(question || '  > ');
  return val.trim().toLowerCase();
}

async function getChoice(max, promptText) {
  while (true) {
    const input = (await prompt(promptText)).trim().toLowerCase();
    const num = parseInt(input);
    if (num >= 1 && num <= max) return num;
    // Also accept text shortcuts
    if (input === 'map' || input === 'm') return 'map';
    if (input === 'inventory' || input === 'inv' || input === 'i') return 'inventory';
    if (input === 'evidence' || input === 'e') return 'evidence';
    if (input === 'help' || input === 'h') return 'help';
    if (input === 'quit' || input === 'q') return 'quit';
    print(colorize(`  Please enter a number (1-${max}), or: map, inventory, evidence, help, quit`, C.dim, C.red));
  }
}

async function pressEnter() {
  await prompt('  Press ENTER to continue...');
}

async function getTextInput(promptText) {
  while (true) {
    const input = (await prompt(promptText)).trim().toLowerCase();
    if (input.length > 0) return input;
    print(colorize('  Please enter something.', C.dim, C.red));
  }
}

// --- Game State ---
const gameState = {
  playerName: 'Alex Carter',
  currentLocation: 'police_station',
  currentCase: 0,       // 0 = prologue, 1-3 = cases
  casesSolved: 0,
  casesCorrect: 0,      // correctly accused the right person

  // Clues & Evidence collected per case
  clues: {
    case1: [],
    case2: [],
    case3: []
  },
  evidence: {
    case1: [],
    case2: [],
    case3: []
  },

  // People interrogated per case
  interrogated: {
    case1: [],
    case2: [],
    case3: []
  },

  // Key decisions that affect the ending
  decisions: {
    trustedMadeleine: false,    // Case 1
    savedTheWitness: false,     // Case 2
    followedTheClue: false,     // Case 3
    accusedCorrectly: [false, false, false],
    riddlesSolved: 0,
    totalRiddles: 0,
    discoveredConspiracy: false,
    confrontedGovernor: false,
  },

  // Visited locations (for exploration tracking)
  visited: new Set(),

  // Inventory
  inventory: [],

  // Flags for story progression
  flags: {},

  // Score
  score: 0,
};

function addClue(caseNum, clue) {
  const key = `case${caseNum}`;
  if (!gameState.clues[key].includes(clue)) {
    gameState.clues[key].push(clue);
    print();
    printClue(`New clue discovered: ${clue}`);
    gameState.score += 10;
  }
}

function addEvidence(caseNum, evidence) {
  const key = `case${caseNum}`;
  if (!gameState.evidence[key].includes(evidence)) {
    gameState.evidence[key].push(evidence);
    print();
    printEvidence(`Evidence collected: ${evidence}`);
    gameState.score += 15;
  }
}

function addInventory(item) {
  if (!gameState.inventory.includes(item)) {
    gameState.inventory.push(item);
    print(colorize(`  📦 Added to inventory: ${item}`, C.bMagenta));
  }
}

function hasClue(caseNum, clue) {
  return gameState.clues[`case${caseNum}`].includes(clue);
}

function hasEvidence(caseNum, evidence) {
  return gameState.evidence[`case${caseNum}`].includes(evidence);
}

function hasItem(item) {
  return gameState.inventory.includes(item);
}

function setFlag(flag, value = true) {
  gameState.flags[flag] = value;
}

function getFlag(flag) {
  return gameState.flags[flag] || false;
}

function markInterrogated(caseNum, person) {
  const key = `case${caseNum}`;
  if (!gameState.interrogated[key].includes(person)) {
    gameState.interrogated[key].push(person);
  }
}

function wasInterrogated(caseNum, person) {
  return gameState.interrogated[`case${caseNum}`].includes(person);
}

// --- Show Inventory ---
function showInventory() {
  printSubHeader('INVENTORY');
  if (gameState.inventory.length === 0) {
    print(colorize('  Your pockets are empty.', C.dim));
  } else {
    gameState.inventory.forEach((item, i) => {
      print(colorize(`  ${i + 1}. ${item}`, C.white));
    });
  }
  print();
}

// --- Show Evidence Board ---
function showEvidenceBoard() {
  printSubHeader(`EVIDENCE BOARD — Case ${gameState.currentCase}`);
  const key = `case${gameState.currentCase}`;
  
  print(colorize('\n  CLUES:', C.bold, C.bGreen));
  if (gameState.clues[key] && gameState.clues[key].length > 0) {
    gameState.clues[key].forEach((clue, i) => {
      print(colorize(`    ${i + 1}. ${clue}`, C.green));
    });
  } else {
    print(colorize('    No clues yet.', C.dim));
  }

  print(colorize('\n  EVIDENCE:', C.bold, C.bYellow));
  if (gameState.evidence[key] && gameState.evidence[key].length > 0) {
    gameState.evidence[key].forEach((ev, i) => {
      print(colorize(`    ${i + 1}. ${ev}`, C.yellow));
    });
  } else {
    print(colorize('    No evidence yet.', C.dim));
  }

  print(colorize('\n  INTERROGATED:', C.bold, C.bCyan));
  if (gameState.interrogated[key] && gameState.interrogated[key].length > 0) {
    gameState.interrogated[key].forEach((person, i) => {
      print(colorize(`    ${i + 1}. ${person}`, C.cyan));
    });
  } else {
    print(colorize('    No one interrogated yet.', C.dim));
  }
  print();
}

// --- Show Help ---
function showHelp() {
  printSubHeader('HELP');
  print(colorize('  Commands available at any choice prompt:', C.white));
  print(colorize('    [number]    - Select a numbered option', C.dim));
  print(colorize('    map / m     - View the island map', C.dim));
  print(colorize('    inv / i     - View your inventory', C.dim));
  print(colorize('    evidence / e - View your evidence board', C.dim));
  print(colorize('    help / h    - Show this help', C.dim));
  print(colorize('    quit / q    - Quit the game', C.dim));
  print();
  print(colorize('  Tips:', C.bold, C.white));
  print(colorize('    • Explore every location thoroughly', C.dim));
  print(colorize('    • Talk to everyone — alibis can be lies', C.dim));
  print(colorize('    • Solving riddles earns bonus points', C.dim));
  print(colorize('    • Your choices affect the ending!', C.dim));
  print();
}

// --- Riddle System ---
const riddlePool = [
  {
    question: "I have cities, but no houses live there.\nI have mountains, but no trees grow there.\nI have water, but no fish swim there.\nWhat am I?",
    answer: "map",
    hint: "You might use one to navigate this island..."
  },
  {
    question: "I am not alive, but I grow;\nI don't have lungs, but I need air;\nI don't have a mouth, but water kills me.\nWhat am I?",
    answer: "fire",
    hint: "It dances on a candle..."
  },
  {
    question: "The more you take, the more you leave behind.\nWhat am I?",
    answer: "footsteps",
    hint: "You leave them on the beach sand..."
  },
  {
    question: "I speak without a mouth and hear without ears.\nI have no body, but I come alive with the wind.\nWhat am I?",
    answer: "echo",
    hint: "Shout into a cave and you'll find me..."
  },
  {
    question: "I can be cracked, made, told, and played.\nWhat am I?",
    answer: "joke",
    hint: "Something that makes you laugh..."
  },
  {
    question: "What has keys but no locks,\nspace but no room,\nand you can enter but can't go inside?",
    answer: "keyboard",
    hint: "You're probably touching one right now..."
  },
  {
    question: "I have a head and a tail but no body.\nWhat am I?",
    answer: "coin",
    hint: "You flip me to make decisions..."
  },
  {
    question: "What comes once in a minute,\ntwice in a moment,\nbut never in a thousand years?",
    answer: "m",
    hint: "Look at the letters carefully..."
  },
  {
    question: "The person who makes it, sells it.\nThe person who buys it never uses it.\nThe person who uses it never knows they're using it.\nWhat is it?",
    answer: "coffin",
    hint: "It's related to our line of work, sadly..."
  },
  {
    question: "I am always in front of you but cannot be seen.\nWhat am I?",
    answer: "future",
    hint: "Time moves in one direction..."
  },
];

async function presentRiddle(contextText) {
  gameState.decisions.totalRiddles++;
  
  // Pick a riddle that hasn't been used yet
  const usedRiddles = getFlag('usedRiddles') || [];
  let available = riddlePool.filter((_, i) => !usedRiddles.includes(i));
  if (available.length === 0) {
    // Reset if all used
    available = riddlePool;
    setFlag('usedRiddles', []);
  }
  
  const idx = riddlePool.indexOf(available[Math.floor(Math.random() * available.length)]);
  const riddle = riddlePool[idx];
  
  // Track usage
  const used = getFlag('usedRiddles') || [];
  used.push(idx);
  setFlag('usedRiddles', used);

  print();
  printLine('~', 60);
  print(colorize('  🧩 RIDDLE TIME', C.bold, C.bMagenta));
  if (contextText) print(colorize(`  ${contextText}`, C.italic, C.dim));
  printLine('~', 60);
  print();
  riddle.question.split('\n').forEach(line => {
    print(colorize(`    ${line}`, C.bWhite));
  });
  print();

  let attempts = 2;
  while (attempts > 0) {
    const answer = await getTextInput('  Your answer: ');
    
    if (answer.includes(riddle.answer) || riddle.answer.includes(answer)) {
      printSuccess('Correct! Your detective mind is sharp.');
      gameState.decisions.riddlesSolved++;
      gameState.score += 25;
      return true;
    } else {
      attempts--;
      if (attempts > 0) {
        print(colorize(`  💡 Hint: ${riddle.hint}`, C.dim, C.yellow));
        print(colorize(`  (${attempts} attempt${attempts > 1 ? 's' : ''} remaining)`, C.dim, C.red));
      }
    }
  }
  
  print(colorize(`  The answer was: ${riddle.answer}`, C.dim, C.red));
  printNarration('Perhaps the tropical heat is getting to you...');
  return false;
}

// --- Handle Special Commands in Choice Loop ---
async function handleSpecialCommand(cmd) {
  if (cmd === 'map') {
    showMap();
    return true;
  }
  if (cmd === 'inventory') {
    showInventory();
    return true;
  }
  if (cmd === 'evidence') {
    showEvidenceBoard();
    return true;
  }
  if (cmd === 'help') {
    showHelp();
    return true;
  }
  if (cmd === 'quit') {
    print();
    print(colorize('  Are you sure you want to quit? (yes/no)', C.bRed));
    const confirm = await prompt('  > ');
    if (confirm === 'yes' || confirm === 'y') {
      print(colorize('\n  Thank you for playing Island Mystery!', C.bold, C.bCyan));
      print(colorize(`  Final Score: ${gameState.score}`, C.bold, C.bYellow));
      throw new Error('QUIT');
    }
    return true;
  }
  return false;
}

// Wrapper for getChoice that handles special commands
async function getPlayerChoice(max, promptText) {
  while (true) {
    const choice = await getChoice(max, promptText);
    if (typeof choice === 'string') {
      await handleSpecialCommand(choice);
      continue;
    }
    return choice;
  }
}

// --- ASCII Art ---
const TITLE_ART = `
${colorize('', C.bCyan)}
                          ${colorize('~', C.blue)}${colorize('~', C.bBlue)}${colorize('~', C.blue)}${colorize('~', C.bCyan)}${colorize('~', C.cyan)}${colorize('~', C.bBlue)}${colorize('~', C.blue)}${colorize('~', C.bCyan)}
                      ${colorize('~', C.blue)}${colorize('~', C.bBlue)}           ${colorize('~', C.bCyan)}${colorize('~', C.blue)}
                    ${colorize('~', C.bBlue)}     ${colorize('🌴', C.green)}          ${colorize('~', C.blue)}
                   ${colorize('~', C.blue)}    ${colorize('/|\\', C.green)}           ${colorize('~', C.bCyan)}
                  ${colorize('~', C.bCyan)}    ${colorize('/ | \\', C.green)}    ${colorize('🌴', C.green)}    ${colorize('~', C.blue)}
                  ${colorize('~', C.blue)}   ${colorize('__|__|__', C.yellow)}  ${colorize('/|\\', C.green)}   ${colorize('~', C.bBlue)}
                  ${colorize('~', C.bCyan)}  ${colorize('/ _____ \\', C.yellow)}${colorize('/ | \\', C.green)}  ${colorize('~', C.blue)}
                   ${colorize('~', C.blue)} ${colorize('|  |☠|  |', C.red)}${colorize('__|_|', C.yellow)}  ${colorize('~', C.bCyan)}
                    ${colorize('~', C.bBlue)}${colorize('|__|___|__|___', C.yellow)}${colorize('~', C.blue)}${colorize('~', C.bBlue)}
               ${colorize('~', C.bBlue)}${colorize('~', C.blue)}${colorize('≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈', C.bBlue)}${colorize('~', C.blue)}${colorize('~', C.bCyan)}
            ${colorize('≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈', C.blue)}
          ${colorize('≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈', C.blue)}
`;

const SKULL_ART = `${colorize(`
          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          ░░░░░░░▄▄▄▄▄▄▄▄▄▄▄▄▄░░░░░░░░
          ░░░░░▄▀░░░░░░░░░░░░░▀▄░░░░░░
          ░░░░▐░░░░░░░░░░░░░░░░░▌░░░░░
          ░░░░▐░░▀▀▄▄░░░░▄▄▀▀░░▌░░░░░
          ░░░░▐░░░░░░░░▐░░░░░░░░▌░░░░░
          ░░░░░▀▄░░░▄▄▄▄▄░░░▄▀░░░░░░░
          ░░░░░░░▀▀▀▐▐▐▐▐▀▀▀░░░░░░░░░
          ░░░░░░░░░░░▐▐▐▐▐░░░░░░░░░░░
`, C.dim, C.white)}`;

const BADGE_ART = `${colorize(`
              ╔═══════════════════╗
              ║  ★ DETECTIVE ★    ║
              ║  INSPECTOR        ║
              ║  ALEX CARTER      ║
              ║  ─────────────    ║
              ║  SAINT-HONORÉ     ║
              ║  POLICE DEPT.     ║
              ╚═══════════════════╝
`, C.bYellow)}`;

const POLICE_STATION_ART = `${colorize(`
          ┌─────────────────────────────┐
          │     SAINT-HONORÉ POLICE     │
          │   ┌──┐  ╔══════╗  ┌──┐     │
          │   │░░│  ║ OPEN ║  │░░│     │
          │   │░░│  ╚══════╝  │░░│     │
          │   └──┘  ┌──────┐  └──┘     │
          │─────────┤ DOOR ├───────────│
          │         └──────┘           │
          └─────────────────────────────┘
             🌴                   🌴
`, C.bCyan)}`;

// ============================================================================
//  SECTION 2: MAP & LOCATIONS  (placeholder — filled in next section)
// ============================================================================

const ISLAND_MAP = `
${colorize('╔══════════════════════════════════════════════════════════╗', C.bYellow)}
${colorize('║', C.bYellow)}${colorize('          SAINT-HONORÉ ISLAND — CARIBBEAN SEA             ', C.bold)}${colorize('║', C.bYellow)}
${colorize('╠══════════════════════════════════════════════════════════╣', C.bYellow)}
${colorize('║', C.bYellow)}                                                          ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}        ${colorize('🏔️  Jungle Trail', C.green)}                                  ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}        ${colorize('  /         \\', C.green)}            ${colorize('🏠 Governor\'s', C.bRed)}          ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}       ${colorize(' /           \\', C.green)}           ${colorize('   Mansion', C.bRed)}             ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}  ${colorize('🗼 Old', C.yellow)}${colorize('              \\', C.green)}                                ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}  ${colorize('Lighthouse', C.yellow)}${colorize('           \\', C.green)}     ${colorize('🏪 Catherine\'s', C.magenta)}              ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}    ${colorize('|', C.yellow)}${colorize('                  |', C.green)}    ${colorize('   Market', C.magenta)}                  ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}    ${colorize('|', C.yellow)}     ${colorize('🌿 La Fontaine', C.bGreen)}   ${colorize('|', C.green)}                             ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}    ${colorize('|', C.yellow)}     ${colorize('   Plantation', C.bGreen)}    ${colorize('|', C.green)}                             ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}    ${colorize('|', C.yellow)}${colorize('                   |', C.green)}   ${colorize('👮 Police', C.bCyan)}                    ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}     ${colorize('\\', C.yellow)}${colorize('                  |', C.green)}   ${colorize('   Station', C.bCyan)}                   ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}      ${colorize('\\', C.yellow)}${colorize('         🍹 Rum  |', C.green)}                              ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}       ${colorize('\\', C.yellow)}${colorize('           Shack |', C.green)}                              ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}        ${colorize('\\', C.yellow)}${colorize('               /', C.green)}                               ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}    ${colorize('🏖️ Honoré', C.bYellow)}${colorize('          /', C.green)}    ${colorize('⚓ The Docks', C.bBlue)}                ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}    ${colorize('   Beach', C.bYellow)}${colorize('          /', C.green)}                                 ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}          ${colorize('\\       /', C.green)}     ${colorize('🏝️ Hidden Cove', C.bMagenta)}                ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}           ${colorize('\\_____/', C.green)}                                     ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}      ${colorize('≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈', C.blue)}           ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}    ${colorize('≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈', C.blue)}         ${colorize('║', C.bYellow)}
${colorize('║', C.bYellow)}                                                          ${colorize('║', C.bYellow)}
${colorize('╚══════════════════════════════════════════════════════════╝', C.bYellow)}
`;

// Location data — will be expanded in Section 2
const locations = {
  police_station: {
    name: 'Honoré Police Station',
    description: 'The small, colourful police station that serves as your headquarters. A whiteboard covered in case notes dominates one wall, and a ceiling fan clicks lazily overhead.',
    art: POLICE_STATION_ART,
    connections: ['honore_beach', 'rum_shack', 'market', 'governors_mansion', 'docks'],
  },
  honore_beach: {
    name: 'Honoré Beach',
    description: 'A stunning stretch of white sand with crystal-clear turquoise water. Palm trees sway in the warm breeze. A beach house sits at the far end.',
    art: `${colorize(`
          🌅                          🌴  🌴
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      ~~  ~~  ~~  ~~  ~~  ~~  ~~  ~~  ~~
      ....................................
      . . . . . . . . . . . . . . . . . .
      ....................................
          🐚      🦀        🐚     ⛱️
    `, C.bYellow)}`,
    connections: ['police_station', 'jungle_trail', 'lighthouse', 'hidden_cove'],
  },
  rum_shack: {
    name: 'The Rum Shack Bar',
    description: "A lively open-air bar with a corrugated tin roof, string lights, and the best rum punch on the island. The regulars know everyone's business.",
    art: `${colorize(`
          ┌───────────────────────┐
          │ 🍹 THE RUM SHACK 🍹  │
          ├───────────────────────┤
          │ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ │
          │ │🥃│ │🍺│ │🥃│ │🍹│ │🍺│ │
          │ └─┘ └─┘ └─┘ └─┘ └─┘ │
          │  ═══════════════════  │
          │  ░░░░░BAR░░░░░░░░░░  │
          └───────────────────────┘
      🌴         🪑  🪑  🪑         🌴
    `, C.bYellow)}`,
    connections: ['police_station', 'plantation', 'jungle_trail'],
  },
  market: {
    name: "Catherine's Market",
    description: 'A bustling open-air market full of tropical fruit, fresh fish, spices, and local crafts. The hub of island gossip.',
    art: `${colorize(`
       🍌 🥭 🍍 CATHERINE'S MARKET 🐟 🦐 🌶️
       ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
       │ 🍎 │ │ 🐠 │ │ 🌺 │ │ 🧺 │ │ 🫖 │
       │    │ │    │ │    │ │    │ │    │
       └────┘ └────┘ └────┘ └────┘ └────┘
       ════════════════════════════════════
    `, C.bMagenta)}`,
    connections: ['police_station', 'governors_mansion', 'plantation'],
  },
  plantation: {
    name: 'La Fontaine Plantation',
    description: 'A grand old colonial plantation house, now converted into a luxury hotel. Lush gardens surround the property, and the scent of jasmine fills the air.',
    art: `${colorize(`
                  ╔═══════╗
                  ║ 🏛️    ║
            ┌─────╨───────╨─────┐
            │  LA FONTAINE       │
            │  PLANTATION HOTEL  │
            │  ┌──┐  ┌──┐  ┌──┐ │
            │  │🪟│  │🚪│  │🪟│ │
            └──┴──┴──┴──┴──┴──┴─┘
         🌺  🌿  🌴  🌺  🌿  🌴  🌺
    `, C.bGreen)}`,
    connections: ['rum_shack', 'market', 'jungle_trail'],
  },
  governors_mansion: {
    name: "The Governor's Mansion",
    description: 'An imposing hilltop mansion with white columns and sweeping views of the harbour. The seat of power on Saint-Honoré.',
    art: `${colorize(`
              🏴  ╔════════════╗  🏴
                  ║  GOVERNOR  ║
            ┌─────╨────────────╨─────┐
            │  ┌───┐ ╔══════╗ ┌───┐  │
            │  │ 🪟 │ ║ENTRY ║ │ 🪟 │  │
            │  └───┘ ╚══════╝ └───┘  │
            │ ┌──┐ ┌──┐ ┌──┐ ┌──┐   │
            │ │🪟│ │🪟│ │🪟│ │🪟│   │
            └─┴──┴─┴──┴─┴──┴─┴──┴───┘
            🌳  🌳  🌳  🌳  🌳  🌳
    `, C.bRed)}`,
    connections: ['police_station', 'market', 'jungle_trail'],
  },
  jungle_trail: {
    name: 'The Jungle Trail',
    description: 'A winding path through dense tropical vegetation. The canopy blocks most sunlight, and strange sounds echo from the undergrowth.',
    art: `${colorize(`
        🌴🌿🌴  🌿🌴  🌿🌴🌿🌴
       🌿 ┌──────────────┐ 🌿
       🌴 │ ░░░░░░░░░░░░ │ 🌴
       🌿 │ ░░  TRAIL  ░░ │ 🌿
       🌴 │ ░░░░░░░░░░░░ │ 🌴
       🌿 └──────────────┘ 🌿
        🌴🌿🦜  🌿🌴  🐒🌴🌿🌴
    `, C.green)}`,
    connections: ['honore_beach', 'rum_shack', 'plantation', 'governors_mansion', 'lighthouse'],
  },
  lighthouse: {
    name: 'The Old Lighthouse',
    description: 'An abandoned lighthouse on the rocky western point. Its light has been dark for decades, and locals say it is haunted.',
    art: `${colorize(`
                ╔══╗
                ║💡║
                ╠══╣
                │  │
               ┌┤  ├┐
               │├──┤│
               │├──┤│
               │├──┤│
              ┌┤├──┤├┐
              │└┤  ├┘│
              └─┴──┴─┘
           🪨  🪨 ≈≈≈≈  🪨
    `, C.bYellow)}`,
    connections: ['honore_beach', 'jungle_trail', 'hidden_cove'],
  },
  docks: {
    name: 'The Docks',
    description: 'The bustling harbour where fishing boats and the ferry to Guadeloupe come and go. The smell of salt and diesel hangs in the air.',
    art: `${colorize(`
       ⚓ THE DOCKS ⚓
       ┌───┐ ┌───┐ ┌───┐
       │ ⛵ │ │ 🚢 │ │ ⛵ │
       └─┬─┘ └─┬─┘ └─┬─┘
      ═══╧═════╧═════╧═══════
      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
      ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
    `, C.bBlue)}`,
    connections: ['police_station', 'hidden_cove'],
  },
  hidden_cove: {
    name: 'The Hidden Cove',
    description: 'A secluded cove accessible only by boat or a treacherous cliff path. Smugglers once used it, and the caves still hold secrets.',
    art: `${colorize(`
       🪨🪨🪨               🪨🪨🪨
       🪨   ╔═══════════╗   🪨
       🪨   ║ HIDDEN    ║   🪨
        🪨  ║   COVE    ║  🪨
         🪨 ╚═══════════╝ 🪨
          ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
        ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
    `, C.bMagenta)}`,
    connections: ['honore_beach', 'lighthouse', 'docks'],
  },
};

function showMap() {
  print(ISLAND_MAP);
  
  // Show current location marker
  print(colorize(`  📍 You are at: ${locations[gameState.currentLocation].name}`, C.bold, C.bGreen));
  print(colorize('  Connections:', C.dim));
  locations[gameState.currentLocation].connections.forEach(conn => {
    const visited = gameState.visited.has(conn) ? colorize(' ✓', C.green) : '';
    print(colorize(`    → ${locations[conn].name}${visited}`, C.dim, C.white));
  });
  print();
}

function showLocation(locId) {
  const loc = locations[locId];
  gameState.currentLocation = locId;
  gameState.visited.add(locId);
  
  print();
  printHeader(loc.name.toUpperCase());
  if (loc.art) printLocationArt(loc.art);
  print(colorize(`  ${loc.description}`, C.white));
  print();
}

// Navigation system
async function navigate() {
  const current = locations[gameState.currentLocation];
  
  printSubHeader('TRAVEL');
  current.connections.forEach((conn, i) => {
    const visited = gameState.visited.has(conn) ? colorize(' (visited)', C.dim) : '';
    printChoice(i + 1, locations[conn].name, visited);
  });
  
  const choice = await getPlayerChoice(current.connections.length);
  const dest = current.connections[choice - 1];
  
  print();
  printNarration(`You make your way to ${locations[dest].name}...`);
  await pressEnter();
  
  showLocation(dest);
  return dest;
}


// ============================================================================
//  TITLE SCREEN & INTRO
// ============================================================================

async function titleScreen() {
  Terminal.clear();
  print(TITLE_ART);
  print();
  print(colorize('    ╔══════════════════════════════════════════════╗', C.bold, C.bRed));
  print(colorize('    ║                                              ║', C.bold, C.bRed));
  print(colorize('    ║', C.bold, C.bRed) + colorize('          I S L A N D   M Y S T E R Y          ', C.bold, C.bWhite) + colorize('║', C.bold, C.bRed));
  print(colorize('    ║', C.bold, C.bRed) + colorize('        Death on Saint-Honoré                   ', C.bold, C.dim) + colorize('║', C.bold, C.bRed));
  print(colorize('    ║                                              ║', C.bold, C.bRed));
  print(colorize('    ╚══════════════════════════════════════════════╝', C.bold, C.bRed));
  print();
  print(SKULL_ART);
  print(colorize('         A Caribbean Detective Mystery Game', C.dim, C.italic));
  print(colorize('       Inspired by BBC\'s "Death in Paradise"', C.dim, C.italic));
  print();
  printLine('═', 56);
  print();
  printChoice(1, 'New Game');
  printChoice(2, 'About');
  printChoice(3, 'Quit');
  print();
  
  const choice = await getPlayerChoice(3);
  
  if (choice === 2) {
    await showAbout();
    return titleScreen();
  }
  if (choice === 3) {
    print(colorize('\n  Goodbye, Detective.\n', C.bCyan));
    throw new Error('QUIT');
  }
}

async function showAbout() {
  Terminal.clear();
  printHeader('ABOUT');
  print();
  print(colorize('  Island Mystery: Death on Saint-Honoré', C.bold, C.bWhite));
  print();
  print(colorize('  You play as Detective Inspector Alex Carter, a', C.white));
  print(colorize('  London detective transferred to the Caribbean island', C.white));
  print(colorize('  of Saint-Honoré. Three murders. One conspiracy.', C.white));
  print(colorize('  Your choices shape the outcome.', C.white));
  print();
  print(colorize('  Features:', C.bold, C.bCyan));
  print(colorize('    • 3 interconnected murder cases', C.white));
  print(colorize('    • 10 explorable island locations', C.white));
  print(colorize('    • Interrogate suspects & collect evidence', C.white));
  print(colorize('    • Solve riddles to unlock secrets', C.white));
  print(colorize('    • 4 different endings based on your choices', C.white));
  print(colorize('    • Full evidence board & island map', C.white));
  print();
  print(colorize('  Commands: map, inventory, evidence, help, quit', C.dim));
  print();
  await pressEnter();
}

async function prologue() {
  Terminal.clear();
  print(BADGE_ART);
  print();
  
  await printSlow(colorize('  London. Six months ago.', C.bold, C.bWhite), 30);
  print();
  await printSlow(colorize('  The rain hammered against the windows of Scotland Yard.', C.white), 20);
  await printSlow(colorize('  You stared at the transfer papers on your desk.', C.white), 20);
  await printSlow(colorize('  "Saint-Honoré. The Caribbean." Your chief said it like', C.white), 20);
  await printSlow(colorize('  a holiday. But you knew better. The last detective', C.white), 20);
  await printSlow(colorize('  they sent there... never came back.', C.bRed), 20);
  print();
  await pressEnter();
  
  Terminal.clear();
  print(colorize(`
    ✈️  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ✈️
    
       L O N D O N  ──────>  S A I N T - H O N O R É
    
    ✈️  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ✈️
  `, C.bCyan));
  print();
  
  await printSlow(colorize('  The heat hits you the moment you step off the plane.', C.white), 20);
  await printSlow(colorize('  Blinding sunlight. The scent of hibiscus and sea salt.', C.white), 20);
  await printSlow(colorize('  A far cry from the grey skies of London.', C.white), 20);
  print();
  await printSlow(colorize('  A woman in a police uniform waves at you from a battered', C.white), 20);
  await printSlow(colorize('  Land Rover at the arrivals gate.', C.white), 20);
  print();
  
  printDialogue('Sergeant Camille Bordey', "Detective Carter? Welcome to Saint-Honoré!");
  printDialogue('Sergeant Camille Bordey', "I hope you like the heat, because it doesn't stop.");
  print();
  printDialogue('You', "I packed accordingly. Mostly.");
  print();
  printNarration('She laughs and motions for you to get in the jeep.');
  print();
  
  await pressEnter();
  Terminal.clear();
  
  await printSlow(colorize('  As you drive through the winding coastal roads, Camille', C.white), 20);
  await printSlow(colorize('  fills you in on the team.', C.white), 20);
  print();
  
  printDialogue('Camille', "There's me — Sergeant Bordey. I grew up on this island.");
  printDialogue('Camille', "Officer Dwayne Myers — he knows every soul on Saint-Honoré.");
  printDialogue('Camille', "And Junior Officer JP Hooper — young, keen, a bit clumsy.");
  print();
  
  printDialogue('Camille', "Our station is small, but we get the job done.");
  printDialogue('Camille', "Well... usually. Things have been... complicated lately.");
  print();
  
  printChoice(1, "Complicated how?");
  printChoice(2, "I'm sure it'll be fine.");
  
  const choice = await getPlayerChoice(2);
  
  print();
  if (choice === 1) {
    printDialogue('Camille', "Three people. Dead. In three months. And no one arrested.");
    printDialogue('Camille', "That's why they sent for you, Inspector.");
    printNarration('Her jaw tightens. This is personal for her.');
    setFlag('asked_about_complications', true);
    gameState.score += 5;
  } else {
    printDialogue('Camille', "...Right. Well, we'll see about that.");
    printNarration("She doesn't look convinced.");
  }
  
  await pressEnter();
  Terminal.clear();
  
  // Arrival at station
  showLocation('police_station');
  
  await printSlow(colorize('  You step into the Honoré Police Station for the first time.', C.white), 20);
  await printSlow(colorize('  It is small, hot, and a lizard stares at you from the wall.', C.white), 20);
  print();
  
  printDialogue('Dwayne', "Inspector! Welcome, welcome! You want some coffee?");
  printDialogue('Dwayne', "Or rum? Coffee with rum? That's what I recommend.");
  print();
  printDialogue('JP', "Sir! Officer JP Hooper. Reporting for duty, sir!");
  printNarration('JP salutes so hard he nearly falls over.');
  print();
  
  printDialogue('Camille', "Settle in, Inspector. Because your first case starts...");
  print();
  
  // Phone rings
  await printSlow(colorize('  ☎️  RIIIIING! RIIIIING!', C.bold, C.bRed), 30);
  print();
  
  printDialogue('Camille', "...now.");
  print();
  
  await printSlow(colorize('  Camille answers the phone. Her face goes pale.', C.white), 20);
  print();
  printDialogue('Camille', "There's been a murder. At the beach house on Honoré Beach.");
  printDialogue('Camille', "A British businessman. Found dead this morning.");
  print();

  printAlert("CASE 1: THE MURDER AT THE BEACH HOUSE");
  print();
  
  await printSlow(colorize('  Welcome to Saint-Honoré, Detective.', C.bold, C.bCyan), 25);
  await printSlow(colorize('  The island is beautiful. The people are warm.', C.white), 20);
  await printSlow(colorize('  And someone here... is a killer.', C.bold, C.bRed), 25);
  print();
  
  await pressEnter();
  
  gameState.currentCase = 1;
}

// ============================================================================
//  SECTION 3: CHARACTERS, SUSPECTS, WITNESSES & STORY FRAMEWORK
// ============================================================================

// --- Your Team ---
const team = {
  camille: {
    name: 'Sergeant Camille Bordey',
    shortName: 'Camille',
    role: 'Sergeant',
    description: 'Born and raised on Saint-Honoré. Sharp, passionate, and fiercely loyal to the island. She knows the local culture inside-out and has connections everywhere.',
    personality: 'Direct, warm but tough, occasionally impatient with your British ways.',
    art: `${colorize(`
        ┌─────────┐
        │  ◉   ◉  │
        │    ▲    │
        │  ╰───╯  │
        │ CAMILLE │
        │ Sergeant│
        └─────────┘`, C.bCyan)}`,
  },
  dwayne: {
    name: 'Officer Dwayne Myers',
    shortName: 'Dwayne',
    role: 'Officer',
    description: "A veteran officer who's been on the force for 25 years. Knows every person, every rumour, and every secret on Saint-Honoré. Prefers rum to paperwork.",
    personality: 'Laid-back, funny, street-smart, surprisingly wise when it counts.',
    art: `${colorize(`
        ┌─────────┐
        │  ◉   ◉  │
        │    ▲    │
        │  ╰───╯  │
        │ DWAYNE  │
        │ Officer │
        └─────────┘`, C.bYellow)}`,
  },
  jp: {
    name: 'Junior Officer JP Hooper',
    shortName: 'JP',
    role: 'Junior Officer',
    description: 'Eager, enthusiastic, and accident-prone. JP makes up for his clumsiness with dogged determination and a surprising talent for forensic detail.',
    personality: 'Nervous, eager to please, sometimes brilliant, often trips over things.',
    art: `${colorize(`
        ┌─────────┐
        │  ◉   ◉  │
        │    ▲    │
        │  ╰───╯  │
        │   JP    │
        │ Junior  │
        └─────────┘`, C.bGreen)}`,
  },
};

// --- Case 1 Suspects: The Murder at the Beach House ---
// Victim: Victor Pearce, 58, British property developer
const case1Characters = {
  victim: {
    name: 'Victor Pearce',
    age: 58,
    description: 'British property developer. Found dead in his rented beach house with a single stab wound. Wealthy, arrogant, and had many enemies.',
    art: `${colorize(`
        ┌─────────────────────────────────┐
        │       ╔═══════════════╗         │
        │       ║   ☠ VICTIM ☠  ║         │
        │       ║ VICTOR PEARCE ║         │
        │       ║  Age: 58      ║         │
        │       ║  British      ║         │
        │       ║  Developer    ║         │
        │       ╚═══════════════╝         │
        │  Found: Beach House, 7:15 AM    │
        │  Cause: Single stab wound       │
        │  Weapon: Kitchen knife (missing)│
        └─────────────────────────────────┘`, C.bRed)}`,
  },
  suspects: {
    madeleine: {
      name: 'Madeleine Duval',
      age: 34,
      occupation: 'Hotel Manager (La Fontaine Plantation)',
      description: 'Elegant, composed French-Creole woman who manages the island\'s most prestigious hotel. Victor was trying to buy her family\'s plantation to build a resort.',
      location: 'plantation',
      motive: 'Victor was forcing a hostile buyout of her family\'s plantation — her entire heritage.',
      alibi: 'Claims she was at the hotel all evening doing accounts. Night porter confirms... mostly.',
      secret: 'She visited Victor at 10 PM to beg him to stop the buyout. She left at 10:30. She didn\'t mention this.',
      isGuilty: false,
      interrogationDialogue: {
        initial: [
          "Inspector, I heard about Victor. How terrible. Though I can't say many tears will be shed.",
          "He was trying to buy La Fontaine — my family has owned it for six generations.",
          "I was at the hotel all evening. Ask Gérard, the night porter. He saw me.",
        ],
        pressured: [
          "...Fine. Yes, I went to see Victor that evening. At ten o'clock.",
          "I begged him to reconsider the purchase. He laughed in my face.",
          "I left at half past ten. He was very much alive. And very much cruel.",
          "I didn't mention it because I knew how it would look. But I did NOT kill him.",
        ],
        withEvidence: [
          "My earring? At the beach house? I... I must have dropped it when I visited.",
          "This doesn't prove anything! I told you I was there!",
        ],
      },
    },
    roger: {
      name: 'Roger Pearce',
      age: 32,
      occupation: 'Victor\'s Son / Business Partner',
      description: 'Victor\'s estranged son who arrived on the island two days before the murder. They had a very public argument at the Rum Shack.',
      location: 'rum_shack',
      motive: 'Stands to inherit £4.2 million. Relationship with father was toxic — Victor cut him out of the business.',
      alibi: 'Says he was drinking at the Rum Shack until midnight, then walked back to his hotel room.',
      secret: 'He secretly met with a lawyer on the island to contest his father\'s will BEFORE the murder.',
      isGuilty: false,
      interrogationDialogue: {
        initial: [
          "My father is dead. I... I can't believe it.",
          "We had our differences, yes. What family doesn't?",
          "I was at the Rum Shack all night. Ask anyone there.",
        ],
        pressured: [
          "Alright, yes, we argued! He cut me out of the business! His own son!",
          "But I didn't kill him. I wanted him to see reason, not... not this.",
          "I admit I'd had too much to drink. But murder? No.",
        ],
        withEvidence: [
          "A lawyer? I... I was just exploring my options. That's not illegal!",
          "The will was unfair! He was leaving everything to some charity!",
        ],
      },
    },
    selina: {
      name: 'Selina Artwell',
      age: 42,
      occupation: 'Real Estate Agent',
      description: 'A sharp, ambitious real estate agent who brokered Victor\'s Caribbean deals. Glamorous but ruthless. She knows where every body is buried — figuratively.',
      location: 'governors_mansion',
      motive: 'Victor discovered she had been skimming commission — £200,000 over three years. He threatened to expose her.',
      alibi: 'Claims she was at a cocktail party at the Governor\'s Mansion. Left at 11 PM.',
      secret: 'She left the party at 9:30, not 11. CCTV at the mansion gates can prove this. She is the killer.',
      isGuilty: true,
      interrogationDialogue: {
        initial: [
          "Victor? Dead? Oh my God. He was my biggest client.",
          "I was at the Governor's cocktail party all evening. Dozens of witnesses.",
          "I have no idea who would do this. He was a businessman, not a monster.",
        ],
        pressured: [
          "Skimming? That is a vile accusation! Victor was confused about the accounts.",
          "I was handling complex international transactions. Numbers get muddled.",
          "I left the party at eleven. You can check with the Governor himself.",
        ],
        withEvidence: [
          "The CCTV must be wrong. Those cameras are ancient.",
          "...Alright. I left early. I had a headache. I went for a drive.",
          "But I did NOT go to that beach house!",
        ],
      },
    },
    thomas: {
      name: 'Thomas "Tommy" Baptiste',
      age: 55,
      occupation: 'Local Fisherman',
      description: 'A quiet fisherman who has worked these waters his whole life. Gentle giant. But Victor\'s resort plan would destroy his livelihood and the reef.',
      location: 'docks',
      motive: 'Victor\'s proposed resort would destroy the coral reef and end fishing in the bay — Tommy\'s entire livelihood.',
      alibi: 'Says he was night fishing. His boat GPS could confirm, but the unit is "broken."',
      secret: 'His GPS unit isn\'t broken — it would show he was docked near the beach house at 11 PM. But he went there to vandalise the house as protest, not to kill.',
      isGuilty: false,
      interrogationDialogue: {
        initial: [
          "Dat man Pearce? He dead? Mon Dieu...",
          "I was out fishin' all night. You can ask the sea.",
          "I didn't have nothing to do with this, Inspector.",
        ],
        pressured: [
          "Yeah, I hated what he was doing to dis island! Dat reef is my life!",
          "But hating a man's plans and killing the man — that ain't the same thing.",
          "My GPS broke last week. Bad luck. That's all it is.",
        ],
        withEvidence: [
          "...Okay. Okay. I was near the beach house. I went to spray paint his walls.",
          "I wanted to scare him off the island. 'GO HOME' — that's what I wrote.",
          "When I got there, I heard arguing inside. A woman's voice. I got scared and left.",
          "I swear on my mother's grave — he was alive when I left.",
        ],
      },
    },
  },
  witnesses: {
    gerard: {
      name: 'Gérard Fontaine',
      occupation: 'Night Porter at La Fontaine',
      testimony: "Madeleine? She was here most of the evening. But... she did step out around ten. Came back maybe forty minutes later. Seemed upset.",
      revealsClue: 'Madeleine left hotel at 10 PM',
    },
    barkeep: {
      name: 'Lucky',
      occupation: 'Bartender at the Rum Shack',
      testimony: "Roger Pearce? Oh yeah, he was here. Drinking hard. But he left around... hmm... 10:45? Earlier than he said. He was on his phone, very agitated.",
      revealsClue: 'Roger left Rum Shack at 10:45, not midnight',
    },
    governor_aide: {
      name: 'Patricia Harmon',
      occupation: "Governor's Aide",
      testimony: "The cocktail party? Yes, Selina was here. But I noticed she slipped out quite early. I'd say around 9:30. She didn't come to say goodbye, which was unusual.",
      revealsClue: 'Selina left party at 9:30 PM, not 11 PM',
    },
    early_jogger: {
      name: 'Marie-Claire Perrin',
      occupation: 'Local Teacher / Jogger',
      testimony: "I jog along the beach every morning at 6 AM. This morning I saw a woman's car — a silver Mercedes — parked near the beach house. It was gone by the time I jogged back at 6:30.",
      revealsClue: 'Silver Mercedes near beach house at 6 AM',
    },
  },
};

// --- Case 2 Suspects: The Poisoned Rum Punch ---
// Victim: Chef Antoine Beaumont, 48, celebrity chef
const case2Characters = {
  victim: {
    name: 'Chef Antoine Beaumont',
    age: 48,
    description: 'Celebrity chef and owner of "Le Paradis" restaurant. Found dead at his bar after drinking poisoned rum punch. Cyanide in his signature drink.',
    art: `${colorize(`
        ┌─────────────────────────────────┐
        │       ╔═══════════════╗         │
        │       ║   ☠ VICTIM ☠  ║         │
        │       ║ANTOINE BEAUMONT║        │
        │       ║  Age: 48      ║         │
        │       ║  French       ║         │
        │       ║  Chef         ║         │
        │       ╚═══════════════╝         │
        │  Found: Rum Shack, 9:30 PM     │
        │  Cause: Cyanide poisoning       │
        │  Method: Poisoned rum punch     │
        └─────────────────────────────────┘`, C.bRed)}`,
  },
  suspects: {
    nadia: {
      name: 'Nadia Beaumont',
      age: 44,
      occupation: 'Wife of the Victim',
      description: "Antoine's wife of 15 years. Beautiful, quiet, and always in her husband's shadow. Recently discovered his affairs.",
      location: 'plantation',
      motive: "Discovered Antoine's affair with a younger woman. Prenup means she gets nothing in a divorce, but everything in death.",
      alibi: 'Says she was at the hotel spa all evening. Spa closed at 8 PM.',
      secret: "She purchased potassium cyanide online three weeks ago — 'for cleaning antique jewelry.' She is the killer.",
      isGuilty: true,
      interrogationDialogue: {
        initial: [
          "My husband... my Antoine... who would do this?",
          "I was at the spa at La Fontaine. I had a massage at seven.",
          "Antoine had enemies in the restaurant world, but poison? This is monstrous.",
        ],
        pressured: [
          "An affair? I... I had heard rumours. But Antoine loved me.",
          "The prenup is standard. We signed it years ago when things were different.",
          "I don't know what you're implying, Inspector.",
        ],
        withEvidence: [
          "Cyanide? For... for jewelry cleaning! You can look it up!",
          "Many people use it for restoration. This proves nothing!",
          "...I want a lawyer.",
        ],
      },
    },
    marcus: {
      name: 'Marcus Chen',
      age: 36,
      occupation: 'Sous Chef at Le Paradis',
      description: "Antoine's second-in-command in the kitchen. Talented but constantly belittled by his boss. Antoine stole his recipes and took credit on TV.",
      location: 'market',
      motive: 'Antoine stole his signature recipe and presented it as his own on a television show. Marcus was publicly humiliated.',
      alibi: 'Claims he was shopping late at the market for next day prep.',
      secret: "He was at the market, but he also had a heated phone call with Antoine at 8 PM threatening to expose the recipe theft to the press.",
      isGuilty: false,
      interrogationDialogue: {
        initial: [
          "Chef Antoine is dead? I... I just spoke to him today.",
          "I was at Catherine's Market buying ingredients. Ask Catherine herself.",
          "We had a professional relationship. He was demanding, but that's kitchens.",
        ],
        pressured: [
          "He stole my recipe! My grandmother's recipe! And put it on his TV show!",
          "I confronted him about it. I told him I'd go to the press.",
          "But I'm a chef, not a killer. I destroy people with reviews, not poison.",
        ],
        withEvidence: [
          "That phone call? Yes, I was angry. I said things I regret.",
          "But threatening to call journalists and threatening to kill are very different things.",
        ],
      },
    },
    francois: {
      name: 'François Dupont',
      age: 52,
      occupation: 'Restaurant Rival / Owner of "Chez François"',
      description: "Owner of the competing restaurant. Antoine lured away his best staff and stole his liquor supplier. Their rivalry was legendary and bitter.",
      location: 'rum_shack',
      motive: "Antoine stole his staff, his supplier, and his Michelin star recommendation. François' restaurant is nearly bankrupt.",
      alibi: 'Says he was at his own restaurant all evening.',
      secret: 'He was at his restaurant, but he closed early at 7 PM — his restaurant is failing. He went home and drank alone.',
      isGuilty: false,
      interrogationDialogue: {
        initial: [
          "Antoine Beaumont is dead? Well, I won't pretend to weep.",
          "I was at Chez François all evening. My waiter can confirm.",
          "But Inspector, half this island wanted that man dead. He was a tyrant.",
        ],
        pressured: [
          "Bankrupt? I am... having a difficult season. We all do.",
          "Antoine ruined me! But I was rebuilding! Slowly, yes, but rebuilding!",
          "Poison is a coward's weapon. I am no coward.",
        ],
        withEvidence: [
          "I closed early... because we had no reservations. Is that a crime?",
          "I went home. I drank wine. I watched the sunset. Alone. No alibi. Sue me.",
        ],
      },
    },
    elena: {
      name: 'Elena Vasquez',
      age: 28,
      occupation: 'Waitress / Antoine\'s Mistress',
      description: "A stunning young waitress from Guadeloupe. Was having an affair with Antoine. She claims she loved him, but she's also in his will.",
      location: 'honore_beach',
      motive: "Antoine promised to leave Nadia and marry her but kept postponing. She's also named in a secret amendment to his will — £500,000.",
      alibi: 'Says she was at home all evening watching TV.',
      secret: 'She was actually at the Rum Shack earlier that evening and left at 8:15 PM — 75 minutes before Antoine was poisoned. She delivered his drink before leaving.',
      isGuilty: false,
      interrogationDialogue: {
        initial: [
          "Antoine... no, no, no... this can't be happening!",
          "I was at home. All evening. I was waiting for him to call.",
          "He was going to leave his wife. We were going to be together.",
        ],
        pressured: [
          "The will? I didn't know about that! Antoine mentioned it once but I thought he was joking.",
          "I loved him! Why would I kill the man I love?",
          "I was at HOME. Alone. I don't have anyone to back that up.",
        ],
        withEvidence: [
          "Okay! Yes! I was at the Rum Shack earlier. I brought him his first drink of the evening.",
          "But that was at 8:15! He died at 9:30! Other people served him after me!",
          "Someone else must have poisoned a later drink!",
        ],
      },
    },
  },
  witnesses: {
    catherine: {
      name: 'Catherine Émile',
      occupation: 'Market Owner',
      testimony: "Marcus was here at the market until about 8:30. He seemed agitated after a phone call. Bought snapper, limes, and allspice. Normal order for Le Paradis.",
      revealsClue: 'Marcus was at market until 8:30 PM',
    },
    barman_pete: {
      name: 'Pete "Rum Daddy" Williams',
      occupation: 'Rum Shack Barman',
      testimony: "Antoine was drinking here. The young girl — Elena — she brought him his first drink around 8:15, then left. After that, I served him two more. His wife came by around 9, dropped off his jacket he'd forgotten. Then at 9:25, he collapsed.",
      revealsClue: 'Nadia visited Rum Shack at 9 PM to return jacket',
    },
    spa_manager: {
      name: 'Sophie Laurent',
      occupation: 'La Fontaine Spa Manager',
      testimony: "Nadia Beaumont had a 7 PM appointment. She left the spa at 7:45 PM. We close at 8. She said she was going for a walk on the grounds.",
      revealsClue: 'Nadia left spa at 7:45 PM, over an hour unaccounted for',
    },
    delivery_boy: {
      name: 'Junior',
      occupation: 'Delivery Runner',
      testimony: "I deliver supplies to the restaurants. I saw Madame Beaumont near the Rum Shack around 8:50 PM. She was carrying Antoine's blue jacket. She seemed very calm.",
      revealsClue: 'Nadia was seen near Rum Shack 40 minutes before death',
    },
  },
};

// --- Case 3 Suspects: The Vanishing Witness ---
// Victim: Commissioner James Thorne, 62, head of police oversight
const case3Characters = {
  victim: {
    name: 'Commissioner James Thorne',
    age: 62,
    description: 'Head of Caribbean Police Oversight. Found dead in the old lighthouse. Was secretly investigating corruption on Saint-Honoré.',
    art: `${colorize(`
        ┌─────────────────────────────────┐
        │       ╔═══════════════╗         │
        │       ║   ☠ VICTIM ☠  ║         │
        │       ║ JAMES THORNE  ║         │
        │       ║  Age: 62      ║         │
        │       ║  British      ║         │
        │       ║Commissioner   ║         │
        │       ╚═══════════════╝         │
        │  Found: Old Lighthouse, 6 AM   │
        │  Cause: Blunt force trauma      │
        │  Weapon: Heavy brass telescope  │
        └─────────────────────────────────┘`, C.bRed)}`,
  },
  suspects: {
    governor: {
      name: 'Governor Henry Delacroix',
      age: 64,
      occupation: 'Governor of Saint-Honoré',
      description: "The suave, charming Governor who has held power for 20 years. Everyone loves him. But Thorne was investigating a corruption trail that leads right to his door.",
      location: 'governors_mansion',
      motive: 'Thorne had evidence of the Governor embezzling hurricane relief funds — £3 million diverted to shell companies.',
      alibi: 'Claims he was at the mansion all evening with staff.',
      secret: 'He ordered the murder but did not commit it himself. He sent his enforcer, Karl. He is the mastermind.',
      isGuilty: true, // mastermind
      interrogationDialogue: {
        initial: [
          "Commissioner Thorne? Good Lord. Dead? This is... this is terrible news.",
          "He was a guest of the island. I had dinner with him just last week.",
          "I was at the mansion all evening. My entire staff can vouch for me.",
        ],
        pressured: [
          "Corruption? Inspector, I have served this island faithfully for twenty years!",
          "Thorne was here on a routine inspection. Nothing more.",
          "I suggest you focus on finding the real killer instead of making accusations.",
        ],
        withEvidence: [
          "Shell companies? Those are... those are legitimate business entities!",
          "I will not be interrogated like a common criminal. I am the Governor!",
          "You are making a very dangerous enemy, Inspector.",
        ],
      },
    },
    karl: {
      name: 'Karl Brandt',
      age: 45,
      occupation: 'Governor\'s "Security Advisor"',
      description: 'A cold, calculating German ex-military man who serves as the Governor\'s personal security. Rumoured to do the Governor\'s dirty work.',
      location: 'jungle_trail',
      motive: 'Paid by the Governor. Also personally threatened — Thorne had evidence Karl was involved in smuggling operations.',
      alibi: 'Claims he was on a security patrol of the mansion perimeter.',
      secret: 'He is the one who struck Thorne with the telescope. Physically committed the murder on the Governor\'s orders.',
      isGuilty: true, // actual killer
      interrogationDialogue: {
        initial: [
          "Commissioner Thorne is dead. Unfortunate.",
          "I was conducting my standard perimeter check of the mansion grounds.",
          "I have nothing further to add, Inspector.",
        ],
        pressured: [
          "I am a security professional. I do not answer to innuendo.",
          "The Governor is a good man. I protect good men. That is my job.",
          "Are we done here?",
        ],
        withEvidence: [
          "Interesting evidence, Inspector. Circumstantial at best.",
          "Military boots? Half the men on this island wear them.",
          "...You should be very careful about how far you push this.",
        ],
      },
    },
    helen: {
      name: 'Helen Thorne',
      age: 58,
      occupation: 'Victim\'s Wife',
      description: 'A dignified but cold woman who accompanied her husband to the island. Their marriage was strained — she discovered James had a secret family.',
      location: 'plantation',
      motive: 'James had a secret daughter from an affair 30 years ago. Helen just found out. Insurance policy worth £2 million.',
      alibi: 'Says she was asleep at the hotel all night. Takes sleeping pills.',
      secret: 'She really was asleep. The sleeping pills are genuine. She is heartbroken but innocent.',
      isGuilty: false,
      interrogationDialogue: {
        initial: [
          "James... my James... I can't believe he's gone.",
          "I took my sleeping pills at nine o'clock. I didn't wake until morning.",
          "When they told me... I thought it was a dream. A nightmare.",
        ],
        pressured: [
          "A secret daughter? Yes. I found out a week ago.",
          "Thirty years of marriage and he... he had another family.",
          "But kill him? I wanted to divorce him, not bury him!",
        ],
        withEvidence: [
          "The insurance policy was arranged years ago. Standard for a man in his position.",
          "I know how it looks. But I loved him. Even after what he did.",
        ],
      },
    },
    leon: {
      name: 'Léon Samuels',
      age: 35,
      occupation: 'Journalist / Investigator',
      description: "An aggressive investigative journalist who was working WITH Thorne on the corruption story. Idealistic but reckless.",
      location: 'hidden_cove',
      motive: 'If Thorne published first, Léon would lose the biggest story of his career. Fame vs. justice.',
      alibi: 'Claims he was at the hidden cove, working on his story on a laptop.',
      secret: "He really was at the cove writing. He has time-stamped files to prove it. He's innocent but knows crucial details about the conspiracy.",
      isGuilty: false,
      interrogationDialogue: {
        initial: [
          "Thorne is dead?! No! NO! He had the evidence! He was going to blow this wide open!",
          "I was at the cove. Writing. I have my laptop — the files are time-stamped.",
          "This was the Governor! It HAS to be! Thorne was going to expose him!",
        ],
        pressured: [
          "Jealous? Of Thorne? He was going to share the story with me! We were partners!",
          "I have the drafts, the emails, the encrypted files!",
          "Inspector, you're looking at the wrong people. The rot goes to the very top of this island.",
        ],
        withEvidence: [
          "Here — my laptop. Check the timestamps. Every word written between 8 PM and 2 AM.",
          "I'll give you everything I have. Thorne would have wanted that.",
          "There's a USB drive. Thorne hid it somewhere in the lighthouse before he died.",
        ],
      },
    },
  },
  witnesses: {
    lighthouse_keeper: {
      name: 'Old Pierre',
      occupation: 'Former Lighthouse Keeper',
      testimony: "I live near the lighthouse. Retired. I heard voices around midnight — two men arguing. Then a crash. Then silence. One man left in a hurry — big fellow, walked like a soldier.",
      revealsClue: 'Two men argued at lighthouse, one left walking like a soldier',
    },
    dock_worker: {
      name: 'Emmanuel',
      occupation: 'Night Dock Worker',
      testimony: "I saw Karl Brandt's SUV heading toward the lighthouse road around 11:30 PM. Black Range Rover. Recognised it because it nearly ran me off the road last month.",
      revealsClue: "Karl's SUV seen heading toward lighthouse at 11:30 PM",
    },
    hotel_receptionist: {
      name: 'Annette Moreau',
      occupation: 'La Fontaine Receptionist',
      testimony: "Helen Thorne requested her sleeping pills from me at 8:45 PM. She seemed very distressed about something. She definitely went to her room — I saw her light go off at 9:15.",
      revealsClue: 'Helen confirmed in room by 9:15 PM with sleeping pills',
    },
    fisherman_witness: {
      name: 'Cédric',
      occupation: 'Night Fisherman',
      testimony: "I was bringing my boat in around midnight. Saw a man at the cove — young, white, typing on a bright screen. He was there for hours. Didn't move.",
      revealsClue: 'Léon confirmed at hidden cove at midnight, typing',
    },
  },
};

// --- The Conspiracy Thread (connecting all 3 cases) ---
const conspiracy = {
  summary: `All three murders are connected to Governor Delacroix's corruption network.
    Case 1: Selina Artwell killed Victor Pearce because he discovered she was funnelling 
    money through fake property deals — money that went to the Governor's shell companies.
    Case 2: Nadia Beaumont poisoned Antoine, partly out of jealousy, but she was also 
    being blackmailed by Karl Brandt who knew about her cyanide purchase.
    Case 3: The Governor ordered Thorne killed to stop the corruption investigation.
    The thread: Selina → Governor (money), Karl → Nadia (blackmail), Governor → Karl (murder).`,
  
  clues: [
    'Selina had transfers to a company called "Delacroix Holdings"',
    'Karl was seen meeting with Nadia before Antoine\'s death',
    'Thorne\'s USB drive contains financial records linking all three',
    'The Governor\'s mansion safe contains the original embezzlement records',
  ],
};

// --- Interrogation System ---
async function interrogate(caseNum, suspectKey, characters) {
  const suspect = characters.suspects[suspectKey];
  
  printHeader(`INTERROGATION: ${suspect.name.toUpperCase()}`);
  print(colorize(`  ${suspect.occupation}`, C.dim));
  print(colorize(`  Age: ${suspect.age}`, C.dim));
  print();
  print(colorize(`  ${suspect.description}`, C.white));
  print();
  printLine();
  
  markInterrogated(caseNum, suspect.name);

  // Phase 1: Initial testimony
  print(colorize('\n  — INITIAL TESTIMONY —', C.bold, C.bCyan));
  print();
  for (const line of suspect.interrogationDialogue.initial) {
    printDialogue(suspect.name.split(' ')[0], line);
  }
  print();
  
  printChoice(1, 'Press harder — challenge their story');
  printChoice(2, 'Present evidence (if you have any)');
  printChoice(3, 'Thank them and leave');
  
  const phase1 = await getPlayerChoice(3);
  
  if (phase1 === 1) {
    // Phase 2: Pressured
    print(colorize('\n  — UNDER PRESSURE —', C.bold, C.bYellow));
    print();
    for (const line of suspect.interrogationDialogue.pressured) {
      printDialogue(suspect.name.split(' ')[0], line);
    }
    
    // Reveal clue from pressuring
    if (suspectKey === 'madeleine' || suspectKey === 'nadia' || suspectKey === 'governor') {
      addClue(caseNum, `${suspect.name} changed their story under pressure`);
    }
    if (suspectKey === 'roger') addClue(caseNum, 'Roger and Victor had a bitter business dispute');
    if (suspectKey === 'thomas') addClue(caseNum, 'Tommy heard a woman arguing with Victor');
    if (suspectKey === 'marcus') addClue(caseNum, 'Antoine stole Marcus\'s grandmother\'s recipe for TV');
    if (suspectKey === 'francois') addClue(caseNum, 'François\'s restaurant is nearly bankrupt');
    if (suspectKey === 'karl') addClue(caseNum, 'Karl is ex-military and very defensive');
    if (suspectKey === 'leon') addClue(caseNum, 'Léon and Thorne were working together on corruption story');
    if (suspectKey === 'helen') addClue(caseNum, 'Helen discovered Thorne\'s secret family a week ago');
    if (suspectKey === 'elena') addClue(caseNum, 'Elena was promised marriage by Antoine');
    if (suspectKey === 'selina') addClue(caseNum, 'Selina became defensive about financial discrepancies');
    
    print();
    printChoice(1, 'Present evidence');
    printChoice(2, 'End interrogation');
    
    const phase2 = await getPlayerChoice(2);
    
    if (phase2 === 1) {
      await presentEvidence(caseNum, suspectKey, suspect);
    }
  } else if (phase1 === 2) {
    await presentEvidence(caseNum, suspectKey, suspect);
  }
  
  print();
  printNarration(`You end the interrogation with ${suspect.name}.`);
  await pressEnter();
}

async function presentEvidence(caseNum, suspectKey, suspect) {
  const key = `case${caseNum}`;
  const ev = gameState.evidence[key];
  const clues = gameState.clues[key];
  
  if (ev.length === 0 && clues.length === 0) {
    print();
    printAlert('You have no evidence or clues to present!');
    printNarration('Better do more investigating first...');
    return;
  }
  
  print(colorize('\n  — PRESENTING EVIDENCE —', C.bold, C.bRed));
  print(colorize('\n  Choose evidence to present:', C.white));
  
  const allItems = [...ev, ...clues];
  allItems.forEach((item, i) => {
    printChoice(i + 1, item);
  });
  
  const choice = await getPlayerChoice(allItems.length);
  
  print();
  print(colorize(`  You present: "${allItems[choice - 1]}"`, C.bold, C.bYellow));
  print();
  
  // Phase 3: Confronted with evidence
  for (const line of suspect.interrogationDialogue.withEvidence) {
    printDialogue(suspect.name.split(' ')[0], line);
  }
  
  // Special reveals when correct evidence is presented
  if (suspectKey === 'thomas' && allItems[choice - 1].includes('GPS')) {
    addClue(caseNum, 'Tommy was near beach house but heard woman arguing with Victor');
    printSuccess('Tommy reveals key testimony — he heard a woman\'s voice!');
  }
  if (suspectKey === 'selina' && allItems[choice - 1].includes('CCTV')) {
    addClue(caseNum, 'Selina lied about leaving time — left party at 9:30 not 11');
    printSuccess('Selina\'s alibi is crumbling!');
  }
  if (suspectKey === 'nadia' && allItems[choice - 1].includes('cyanide')) {
    addClue(caseNum, 'Nadia purchased cyanide and had opportunity at 9 PM');
    printSuccess('Nadia is cornered!');
  }
  if (suspectKey === 'leon' && allItems[choice - 1].includes('Thorne')) {
    addClue(caseNum, 'USB drive hidden in lighthouse contains corruption evidence');
    printSuccess('Léon reveals the location of Thorne\'s hidden USB drive!');
  }
  if (suspectKey === 'karl' && allItems[choice - 1].includes('SUV')) {
    addClue(caseNum, 'Karl cannot explain why his SUV was at the lighthouse');
    printSuccess('Karl\'s alibi is broken!');
  }
  
  gameState.score += 10;
}

// --- Team Discussion System ---
async function teamDiscussion(caseNum) {
  printHeader('TEAM DISCUSSION');
  print();
  print(colorize('  You gather the team around the whiteboard at the station.', C.white));
  print();
  
  // Show what we know
  showEvidenceBoard();
  
  // Team members offer insights based on collected clues
  const key = `case${caseNum}`;
  const clueCount = gameState.clues[key].length;
  const evCount = gameState.evidence[key].length;
  
  if (clueCount + evCount < 3) {
    printDialogue('Camille', "We need more evidence, Inspector. We're grasping at air.");
    printDialogue('Dwayne', "Maybe talk to more people? Someone on this island knows something.");
    printDialogue('JP', "Should I... should I make coffee, sir?");
  } else if (clueCount + evCount < 6) {
    printDialogue('Camille', "We're getting somewhere. The alibis don't all line up.");
    printDialogue('Dwayne', "I've got a feeling about this one. Something doesn't smell right.");
    printDialogue('JP', "Sir, I've been going over the timelines. There are gaps.");
  } else {
    printDialogue('Camille', "Inspector, I think we have enough to confront someone.");
    printDialogue('Dwayne', "The pieces are falling into place. Time to make an arrest?");
    printDialogue('JP', "Sir! I've colour-coded the timeline on the whiteboard! Look!");
    printNarration('JP pulls out a surprisingly detailed chart.');
  }
  
  print();
  await pressEnter();
}

// --- Accusation System ---
async function makeAccusation(caseNum, characters) {
  Terminal.clear();
  printHeader(`MAKE YOUR ACCUSATION — CASE ${caseNum}`);
  
  print(colorize(`
  ╔══════════════════════════════════════════════════╗
  ║  This is it, Inspector. The moment of truth.    ║
  ║  Who killed ${characters.victim.name.padEnd(35)}║
  ║  Choose carefully — you can only accuse once.   ║
  ╚══════════════════════════════════════════════════╝
  `, C.bold, C.bRed));
  
  const suspectKeys = Object.keys(characters.suspects);
  suspectKeys.forEach((key, i) => {
    const s = characters.suspects[key];
    const interr = wasInterrogated(caseNum, s.name) ? colorize(' (interrogated)', C.green) : colorize(' (not interrogated)', C.red);
    printChoice(i + 1, s.name, `— ${s.occupation}${interr}`);
  });
  
  print();
  print(colorize('  Review your evidence before choosing:', C.dim));
  printChoice(suspectKeys.length + 1, 'Review evidence board first');
  
  let choice;
  while (true) {
    choice = await getPlayerChoice(suspectKeys.length + 1);
    if (choice === suspectKeys.length + 1) {
      showEvidenceBoard();
      suspectKeys.forEach((key, i) => {
        const s = characters.suspects[key];
        printChoice(i + 1, s.name, `— ${s.occupation}`);
      });
      continue;
    }
    break;
  }
  
  const accusedKey = suspectKeys[choice - 1];
  const accused = characters.suspects[accusedKey];
  
  print();
  print(colorize(`  You point at ${accused.name}.`, C.bold, C.bWhite));
  print();
  
  printDialogue('You', `${accused.name}, I am arresting you for the murder of ${characters.victim.name}.`);
  print();
  
  // Check if correct
  if (accused.isGuilty) {
    await correctAccusation(caseNum, accused, characters);
    return true;
  } else {
    await wrongAccusation(caseNum, accused, characters);
    return false;
  }
}

async function correctAccusation(caseNum, accused, characters) {
  print(colorize(`
  ╔══════════════════════════════════════════════════╗
  ║         ★ ★ ★  CASE SOLVED!  ★ ★ ★            ║
  ╚══════════════════════════════════════════════════╝
  `, C.bold, C.bGreen));
  
  gameState.casesCorrect++;
  gameState.casesSolved++;
  gameState.decisions.accusedCorrectly[caseNum - 1] = true;
  gameState.score += 100;
  
  printDialogue('You', "Let me tell you how it happened...");
  print();
  
  // The famous "here's what happened" monologue varies by case
  if (caseNum === 1) {
    await printSlow(colorize('  You pace the room, just like they do in the old detective shows.', C.italic, C.dim), 18);
    print();
    printDialogue('You', "Selina Artwell, you left the Governor's cocktail party at 9:30 PM — not 11 as you claimed.");
    printDialogue('You', "You drove your silver Mercedes to Victor Pearce's beach house.");
    printDialogue('You', "Victor had discovered you were skimming from his property deals — £200,000.");
    printDialogue('You', "He threatened to expose you. So you took a knife from his kitchen...");
    printDialogue('You', "And you silenced him. Forever.");
    print();
    printDialogue('Selina', "...You can't prove any of this.");
    printDialogue('You', "The CCTV, the car, the financial records, and a fisherman who saw you. I can.");
    print();
    printNarration('Selina Artwell\'s composure shatters. She is led away in handcuffs.');
  } else if (caseNum === 2) {
    await printSlow(colorize('  The Rum Shack falls silent as you begin to speak.', C.italic, C.dim), 18);
    print();
    printDialogue('You', "Nadia Beaumont, you purchased potassium cyanide three weeks ago.");
    printDialogue('You', "You knew Antoine would be at the Rum Shack. He always was.");
    printDialogue('You', "You left the spa at 7:45. You prepared the poison.");
    printDialogue('You', "At 9 PM, you walked into the Rum Shack with his jacket — and slipped cyanide into his drink.");
    printDialogue('You', "Your husband. Your victim.");
    print();
    printDialogue('Nadia', "He destroyed our marriage! He chose HER over me!");
    printDialogue('You', "That may be true. But murder is never the answer.");
    print();
    printNarration('Nadia Beaumont collapses into tears as Camille cuffs her.');
  } else if (caseNum === 3) {
    await printSlow(colorize('  You stand in the Governor\'s grand hallway. All eyes on you.', C.italic, C.dim), 18);
    print();
    printDialogue('You', "Governor Delacroix, you ordered the murder of Commissioner James Thorne.");
    printDialogue('You', "Karl Brandt, you carried it out. You drove to the lighthouse at 11:30 PM.");
    printDialogue('You', "You argued with Thorne. And when he wouldn't back down...");
    printDialogue('You', "You struck him with the brass telescope. Killing him instantly.");
    print();
    printDialogue('Governor', "This is OUTRAGEOUS! I am the Governor of—");
    printDialogue('You', "You are under arrest. Both of you.");
    print();
    printNarration('Karl reaches for his weapon — but Dwayne is faster.');
    printDialogue('Dwayne', "Don't even think about it, my friend.");
    print();
    printNarration('The Governor of Saint-Honoré is led away in handcuffs. The island watches in stunned silence.');
  }
  
  print();
  printDialogue('Camille', "Brilliant work, Inspector. Absolutely brilliant.");
  printDialogue('JP', "That was incredible, sir! Like something from a film!");
  printDialogue('Dwayne', "Drinks at the Rum Shack? I'm buying.");
  print();
  
  await pressEnter();
}

async function wrongAccusation(caseNum, accused, characters) {
  print(colorize(`
  ╔══════════════════════════════════════════════════╗
  ║       ✗ ✗ ✗  WRONG SUSPECT!  ✗ ✗ ✗            ║
  ╚══════════════════════════════════════════════════╝
  `, C.bold, C.bRed));
  
  gameState.casesSolved++;
  gameState.score -= 25;
  
  printDialogue(accused.name.split(' ')[0], "You've got the wrong person, Inspector!");
  print();
  
  // Find the real killer
  const realKiller = Object.values(characters.suspects).find(s => s.isGuilty);
  
  printNarration(`Evidence later reveals that ${realKiller.name} was the true culprit.`);
  printAlert(`The real killer was: ${realKiller.name}`);
  print(colorize(`  Motive: ${realKiller.motive}`, C.dim));
  print();
  
  printDialogue('Camille', "...We got it wrong. The evidence was there, we just didn't see it.");
  printDialogue('Dwayne', "It happens. Doesn't make it right, but it happens.");
  
  print();
  await pressEnter();
}

// --- Scene Investigation Helper ---
async function investigateScene(caseNum, sceneName, art, descriptions, cluesAvailable, evidenceAvailable) {
  showLocation(gameState.currentLocation);
  print(colorize(`  You begin investigating ${sceneName}...`, C.bold, C.bCyan));
  print();
  
  let investigating = true;
  while (investigating) {
    printSubHeader(`INVESTIGATE: ${sceneName.toUpperCase()}`);
    
    const options = [];
    descriptions.forEach((desc, i) => {
      if (!getFlag(`scene_${caseNum}_${i}`)) {
        options.push({ index: i, text: desc.label });
      }
    });
    
    if (options.length === 0) {
      print(colorize('  You\'ve thoroughly investigated this area.', C.dim));
      investigating = false;
      break;
    }
    
    options.forEach((opt, i) => {
      printChoice(i + 1, opt.text);
    });
    printChoice(options.length + 1, 'Leave this scene');
    
    const choice = await getPlayerChoice(options.length + 1);
    
    if (choice === options.length + 1) {
      investigating = false;
      break;
    }
    
    const selected = options[choice - 1];
    const desc = descriptions[selected.index];
    setFlag(`scene_${caseNum}_${selected.index}`);
    
    print();
    print(colorize(`  ${desc.description}`, C.white));
    
    if (desc.clue) {
      addClue(caseNum, desc.clue);
    }
    if (desc.evidence) {
      addEvidence(caseNum, desc.evidence);
    }
    if (desc.item) {
      addInventory(desc.item);
    }
    if (desc.riddle) {
      const solved = await presentRiddle(desc.riddleContext);
      if (solved && desc.riddleReward) {
        addClue(caseNum, desc.riddleReward);
      }
    }
    
    print();
    await pressEnter();
  }
}

// ============================================================================
//  CASE FUNCTIONS (placeholder — filled in Sections 4-6)
// ============================================================================

async function case1() {
  // ============================================================================
  //  CASE 1: THE MURDER AT THE BEACH HOUSE
  // ============================================================================

  Terminal.clear();
  print(colorize(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║       ☠  C A S E   1 :  T H E   M U R D E R  ☠        ║
  ║             A T   T H E   B E A C H   H O U S E         ║
  ║                                                          ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Victim: Victor Pearce, 58, British Property Developer   ║
  ║  Found : Honoré Beach House, 7:15 AM                     ║
  ║  Cause : Single stab wound to the chest                  ║
  ║  Weapon: Kitchen knife — MISSING from scene              ║
  ╚══════════════════════════════════════════════════════════╝
  `, C.bold, C.bRed));

  print(case1Characters.victim.art);
  print();

  await printSlow(colorize('  The team piles into the Land Rover and races to Honoré Beach.', C.white), 18);
  await printSlow(colorize('  Blue sky, white sand, turquoise water — and crime scene tape.', C.white), 18);
  print();

  printDialogue('Camille', "The beach house is rented by wealthy tourists. Victor Pearce had it for three weeks.");
  printDialogue('Dwayne', "I asked around — the man was not popular. Tried to buy half the island.");
  printDialogue('JP', "Sir! The body is inside. Dr. Beauregard did a preliminary — single stab wound, died between 10 PM and midnight.");
  print();

  await pressEnter();

  // ─── PHASE 1: CRIME SCENE INVESTIGATION ───
  Terminal.clear();
  printHeader('CRIME SCENE: THE BEACH HOUSE');

  const BEACH_HOUSE_ART = `${colorize(`
      🌴                                    🌴
          ┌────────────────────────────┐
          │     BEACH HOUSE            │
          │   ┌──┐  ╔═══════╗  ┌──┐   │
          │   │🩸│  ║ CRIME ║  │  │   │
          │   │  │  ║ SCENE ║  │  │   │
          │   └──┘  ╚═══════╝  └──┘   │
          │─────────┤🚧🚧🚧├──────────│
          │     ⛔ DO NOT CROSS ⛔      │
          └────────────────────────────┘
      🏖️ ....................................🏖️
  `, C.bYellow)}`;

  print(BEACH_HOUSE_ART);
  print();
  print(colorize('  The beach house is a modern white villa. Inside, Victor Pearce lies', C.white));
  print(colorize('  face-up on the living room floor. A pool of dried blood beneath him.', C.white));
  print(colorize('  The murder weapon — a kitchen knife — is missing from the scene.', C.white));
  print();

  await pressEnter();

  // Crime scene investigation loop
  const crimeSceneItems = [
    {
      label: 'Examine the body closely',
      description: 'Victor Pearce, 58. Single stab wound to the chest, precise and angled upward. The attacker was shorter than Victor (6\'2"). No defensive wounds — he didn\'t see it coming, or he trusted his killer.',
      clue: 'Killer was shorter than 6\'2" — Victor trusted them',
      evidence: 'Autopsy note: precise wound angle suggests shorter attacker',
    },
    {
      label: 'Search the kitchen',
      description: 'The knife block is missing one knife — a 20cm chef\'s knife. The kitchen is clean, almost too clean. Someone wiped down the counters recently. But you spot a single drop of blood on the tile near the back door.',
      clue: 'Kitchen wiped clean — killer tried to remove evidence',
      evidence: 'Blood drop near back door — killer exited through rear',
    },
    {
      label: 'Check the living room table',
      description: 'Two wine glasses on the table — one with red lipstick on the rim. An expensive Bordeaux, half drunk. Victor was entertaining someone. You bag the glass.',
      clue: 'Victor was drinking wine with a woman before his death',
      evidence: 'Wine glass with red lipstick — female visitor',
    },
    {
      label: 'Inspect the bedroom',
      description: 'The bedroom is undisturbed. On the nightstand: a phone (locked), business papers about "La Fontaine Plantation Acquisition," and a small velvet box containing a woman\'s gold earring — expensive, French design.',
      clue: 'Victor had acquisition papers for La Fontaine Plantation',
      evidence: 'Gold earring found — French design, expensive',
    },
    {
      label: 'Check the back porch and garden',
      description: 'The back porch leads to the beach. Fresh footprints in the sand — two sets. One large (likely Victor\'s) and one smaller. Also: fresh spray paint on the side wall reading "GO HOME" in red.',
      clue: 'Graffiti on beach house wall: "GO HOME" — someone wanted Victor off the island',
      evidence: 'Two sets of footprints — one large, one smaller',
    },
    {
      label: 'Search the trash bins',
      description: 'In the outdoor bin: a torn business card for "Artwell Caribbean Realty" with a handwritten note on the back: "We need to talk. Tonight. -S". Also, a receipt from the Rum Shack dated yesterday.',
      evidence: 'Business card from Selina Artwell: "We need to talk. Tonight. -S"',
    },
    {
      label: 'Examine the security camera',
      description: 'There\'s a security camera mounted above the front door — but the wire has been cut. Clean cut, done with purpose. Whoever came here knew about the camera.',
      clue: 'Security camera wire deliberately cut — killer came prepared',
    },
  ];

  await investigateScene(1, 'The Beach House Crime Scene', BEACH_HOUSE_ART, crimeSceneItems);

  // ─── TRANSITION: BACK TO STATION ───
  Terminal.clear();
  printHeader('BACK AT THE STATION');
  print(POLICE_STATION_ART);
  print();
  printDialogue('Camille', "So what do we know so far, Inspector?");
  print();

  await teamDiscussion(1);

  // ─── PHASE 2: INVESTIGATION HUB ───
  // Player chooses where to go, who to talk to
  let case1Done = false;
  let actionsRemaining = 12; // Limited actions to create urgency

  while (!case1Done && actionsRemaining > 0) {
    Terminal.clear();
    printHeader('CASE 1: INVESTIGATION');
    print(colorize(`  ⏱  Actions remaining: ${actionsRemaining}`, actionsRemaining <= 3 ? C.bRed : C.bYellow));
    print(colorize(`  📍 Current location: ${locations[gameState.currentLocation].name}`, C.dim));
    print();

    printChoice(1, 'Travel to a location', '(explore & find clues)');
    printChoice(2, 'Interrogate a suspect', '(question them at the station)');
    printChoice(3, 'Interview a witness', '(gather testimony)');
    printChoice(4, 'Team discussion', '(review evidence with your team)');
    printChoice(5, 'Solve a riddle', '(bonus clue opportunity)');
    printChoice(6, 'Make your accusation', '(end the case)');
    print();
    print(colorize('  Also available: map, inventory, evidence, help', C.dim));
    print();

    const mainChoice = await getPlayerChoice(6);

    if (mainChoice === 1) {
      // ─── LOCATION EXPLORATION ───
      await case1Explore();
      actionsRemaining--;
    } else if (mainChoice === 2) {
      // ─── INTERROGATION ───
      await case1Interrogation();
      actionsRemaining--;
    } else if (mainChoice === 3) {
      // ─── WITNESS INTERVIEW ───
      await case1Witness();
      actionsRemaining--;
    } else if (mainChoice === 4) {
      // ─── TEAM DISCUSSION ───
      await teamDiscussion(1);
    } else if (mainChoice === 5) {
      // ─── RIDDLE ───
      const solved = await presentRiddle('A local fisherman says he\'ll share a secret if you can answer his riddle...');
      if (solved) {
        addClue(1, 'Fisherman saw a silver car speeding from the beach road at 11:30 PM');
        printSuccess('The fisherman shares what he saw!');
      }
      actionsRemaining--;
      await pressEnter();
    } else if (mainChoice === 6) {
      // ─── ACCUSATION ───
      print();
      print(colorize('  Are you sure you want to make your accusation now?', C.bYellow));
      print(colorize(`  You have ${gameState.clues.case1.length} clues and ${gameState.evidence.case1.length} pieces of evidence.`, C.dim));
      print();
      printChoice(1, 'Yes — I know who did it');
      printChoice(2, 'No — I need more time');
      const confirmAccuse = await getPlayerChoice(2);
      if (confirmAccuse === 1) {
        case1Done = true;
      }
    }
  }

  if (actionsRemaining <= 0 && !case1Done) {
    Terminal.clear();
    printAlert('TIME IS UP!');
    print();
    await printSlow(colorize('  The Commissioner is demanding results. You must make your accusation now.', C.white), 18);
    print();
    printDialogue('Camille', "We\'re out of time, Inspector. Who do you think did it?");
    print();
    await pressEnter();
  }

  // ─── THE ACCUSATION ───
  const case1Correct = await makeAccusation(1, case1Characters);

  // ─── POST-CASE 1 TRANSITION ───
  Terminal.clear();
  print(colorize(`
  ╔══════════════════════════════════════════════════════════╗
  ║                  CASE 1 — CLOSED                        ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Score so far: ${String(gameState.score).padEnd(39)}║
  ║  Clues found: ${String(gameState.clues.case1.length).padEnd(40)}║
  ║  Evidence collected: ${String(gameState.evidence.case1.length).padEnd(34)}║
  ║  Correct accusation: ${(case1Correct ? 'YES ★' : 'NO').padEnd(33)}║
  ╚══════════════════════════════════════════════════════════╝
  `, C.bold, C.bCyan));

  await pressEnter();

  // ─── MADELEINE TRUST DECISION ───
  Terminal.clear();
  printHeader('A QUIET MOMENT');
  print();
  await printSlow(colorize('  Later that evening, you sit on the police station porch.', C.white), 20);
  await printSlow(colorize('  The sunset paints the sky in shades of orange and purple.', C.white), 20);
  await printSlow(colorize('  A figure approaches — Madeleine Duval.', C.white), 20);
  print();

  printDialogue('Madeleine', "Inspector Carter. May I sit?");
  printNarration('She looks elegant but tired. She holds a manila folder.');
  print();
  printDialogue('Madeleine', "I found something in Victor's papers at the plantation.");
  printDialogue('Madeleine', "Financial transfers. From Selina Artwell to a company called... 'Delacroix Holdings.'");
  printDialogue('Madeleine', "The Governor's name is Delacroix. I think there's more going on here.");
  print();

  printNarration('She holds out the folder to you.');
  print();
  printChoice(1, 'Take the folder — trust Madeleine');
  printChoice(2, 'Decline — she could be manipulating you');
  print();

  const trustChoice = await getPlayerChoice(2);

  if (trustChoice === 1) {
    gameState.decisions.trustedMadeleine = true;
    addClue(1, 'Financial transfers from Selina to "Delacroix Holdings"');
    printDialogue('You', "Thank you, Madeleine. This could be important.");
    printDialogue('Madeleine', "Be careful, Inspector. This island has many secrets.");
    printNarration('She disappears into the warm evening.');
    gameState.score += 20;
    setFlag('has_delacroix_lead');
  } else {
    printDialogue('You', "I appreciate the thought. But I need evidence I can verify.");
    printDialogue('Madeleine', "I understand. But if you change your mind... you know where to find me.");
    printNarration('She nods gracefully and walks away into the dusk.');
  }

  print();
  await pressEnter();

  // ─── SETUP CASE 2 ───
  Terminal.clear();
  print();
  await printSlow(colorize('  Two weeks pass on Saint-Honoré.', C.bold, C.bWhite), 30);
  print();
  await printSlow(colorize('  You begin to settle into island life.', C.white), 20);
  await printSlow(colorize('  Morning swims. Rum punch at sunset. The click of the ceiling fan.', C.white), 20);
  await printSlow(colorize('  Then one evening at the Rum Shack...', C.white), 20);
  print();
  await printSlow(colorize('  A man collapses face-first into his drink.', C.bold, C.bRed), 20);
  await printSlow(colorize('  And just like that — the calm is shattered.', C.white), 20);
  print();
  printAlert('CASE 2: THE POISONED RUM PUNCH');
  print();

  await pressEnter();
  gameState.currentCase = 2;
}

// ─── Case 1 Sub-Functions ───

async function case1Explore() {
  Terminal.clear();
  printSubHeader('WHERE DO YOU WANT TO INVESTIGATE?');
  print();

  const explorable = [
    { id: 'honore_beach', label: 'Honoré Beach — re-examine the area around the beach house' },
    { id: 'plantation', label: 'La Fontaine Plantation — where Madeleine Duval works' },
    { id: 'rum_shack', label: 'The Rum Shack — where Roger was drinking' },
    { id: 'governors_mansion', label: "Governor's Mansion — where Selina's cocktail party was" },
    { id: 'docks', label: 'The Docks — where Tommy keeps his fishing boat' },
    { id: 'market', label: "Catherine's Market — island gossip hub" },
  ];

  explorable.forEach((loc, i) => {
    const visited = getFlag(`case1_explored_${loc.id}`) ? colorize(' (explored)', C.dim) : '';
    printChoice(i + 1, loc.label + visited);
  });
  printChoice(7, 'Go back');

  const choice = await getPlayerChoice(7);
  if (choice === 7) return;

  const dest = explorable[choice - 1];
  gameState.currentLocation = dest.id;
  setFlag(`case1_explored_${dest.id}`);

  // Each location has unique discoveries
  if (dest.id === 'honore_beach') {
    await case1ExploreBeach();
  } else if (dest.id === 'plantation') {
    await case1ExplorePlantation();
  } else if (dest.id === 'rum_shack') {
    await case1ExploreRumShack();
  } else if (dest.id === 'governors_mansion') {
    await case1ExploreMansion();
  } else if (dest.id === 'docks') {
    await case1ExploreDocks();
  } else if (dest.id === 'market') {
    await case1ExploreMarket();
  }
}

async function case1ExploreBeach() {
  Terminal.clear();
  showLocation('honore_beach');

  print(colorize('  The beach is cordoned off. JP stands guard, sweating profusely.', C.white));
  print();

  const items = [
    {
      label: 'Walk the beach path toward the road',
      description: 'You follow the sandy path to the main road. Tire tracks in the soft shoulder — a car parked here recently. The tread pattern is from an expensive vehicle. A local dog walker mentions seeing a silver Mercedes here early this morning.',
      clue: 'Silver Mercedes was parked near beach house access road',
    },
    {
      label: 'Check the neighboring beach houses',
      description: 'The neighboring house is owned by a retired couple from Paris. The wife says she heard arguing around 11 PM — a man and a woman. "She sounded English, very proper. He was shouting about money."',
      clue: 'Neighbor heard English woman arguing with Victor about money at 11 PM',
    },
    {
      label: 'Search the rocky outcrop near the water',
      description: 'Climbing over rocks at the east end of the beach, you find something wedged in a crevice — a kitchen knife! The blade has dried blood on it. The killer threw it from the back porch.',
      evidence: 'Murder weapon found — kitchen knife in rocks near beach house',
    },
    {
      label: 'Examine the spray-painted graffiti more closely',
      description: 'The "GO HOME" graffiti is in red spray paint. The letters are large, rough — written by someone in a hurry. Drip patterns suggest it was done at night. The paint smells fresh, maybe done the same night as the murder.',
      clue: 'Graffiti was painted same night as the murder',
    },
  ];

  await investigateScene(1, 'Honoré Beach', '', items);
}

async function case1ExplorePlantation() {
  Terminal.clear();
  showLocation('plantation');

  print(colorize('  La Fontaine Plantation is breathtaking. Jasmine-scented gardens,', C.white));
  print(colorize('  colonial architecture, and an air of faded grandeur.', C.white));
  print();

  printDialogue('Dwayne', "This place been in the Duval family since 1780. Madeleine would die before she let it go.");
  print();

  const items = [
    {
      label: 'Check the hotel guest register',
      description: 'The register shows Victor Pearce visited the hotel three times in the past week — each time to see Madeleine. The last visit was the day before the murder, marked "hostile — security called."',
      clue: 'Victor visited Madeleine 3 times — last visit required security',
    },
    {
      label: 'Talk to Gérard the night porter',
      description: 'Gérard is a quiet older man who sits at the desk every night from 8 PM to 6 AM.',
      clue: 'Night porter confirms: Madeleine left hotel 10 PM, returned 10:40 PM upset',
    },
    {
      label: 'Examine Madeleine\'s office',
      description: 'With Madeleine\'s reluctant permission, you look through her office. Financial ledgers show the plantation is in serious debt. Victor\'s purchase offer was generous — £2.5 million. But Madeleine wrote "NEVER" across the letter in red ink.',
      evidence: 'Plantation in debt — Victor offered £2.5M, Madeleine refused emphatically',
    },
    {
      label: 'Search the grounds near the garden shed',
      description: 'Behind the garden shed, JP finds a pair of muddy shoes — women\'s size 7. The mud matches the beach house path. But they could belong to any guest...',
      evidence: 'Muddy women\'s shoes found — soil matches beach area',
      riddle: true,
      riddleContext: 'The gardener says he locks the shed with a combination. "Solve my riddle and I\'ll tell you who borrowed the key."',
      riddleReward: 'Gardener confirms Madeleine borrowed shed key the night of the murder',
    },
  ];

  await investigateScene(1, 'La Fontaine Plantation', '', items);
}

async function case1ExploreRumShack() {
  Terminal.clear();
  showLocation('rum_shack');

  print(colorize('  The Rum Shack is the island\'s social hub. At any hour, someone', C.white));
  print(colorize('  is propping up the bar with a story to tell.', C.white));
  print();

  printDialogue('Dwayne', "I know everyone here. Let me do the talking... actually, you do it. They'll tell a cop things they won't tell a friend.");
  print();

  const items = [
    {
      label: 'Talk to Lucky the bartender',
      description: 'Lucky polishes a glass and thinks hard. "Roger Pearce? Yeah, he was here that night. Drinking rum like water. Left around 10:45, not midnight like he says. Was on his phone, real agitated."',
      clue: 'Bartender: Roger left at 10:45 PM, not midnight — was agitated on phone',
    },
    {
      label: 'Check the bar\'s CCTV footage',
      description: 'The Rum Shack has a single grainy camera. It confirms Roger was there from 8 PM but left at 10:43 PM. He headed toward the beach road, not toward his hotel.',
      evidence: 'CCTV: Roger left Rum Shack at 10:43 PM, walked toward beach',
    },
    {
      label: 'Ask the regulars about Victor Pearce',
      description: 'An old man at the bar laughs bitterly. "Pearce? Dat man try to buy di whole island! He come here drinking champagne and telling everyone their land is worthless. Tommy nearly punched him last week."',
      clue: 'Victor publicly mocked locals — Tommy nearly attacked him at the bar',
    },
    {
      label: 'Find Roger\'s bar tab receipt',
      description: 'Lucky hands you the receipt. 8 rum punches and a missed call from "Dad" at 9:15 PM. Also — Roger paid with a credit card linked to a law firm: "Whitmore & Associates, Estate Law."',
      evidence: 'Roger\'s receipt shows contact with estate lawyers before the murder',
    },
  ];

  await investigateScene(1, 'The Rum Shack', '', items);
}

async function case1ExploreMansion() {
  Terminal.clear();
  showLocation('governors_mansion');

  print(colorize('  The Governor\'s Mansion sits on the highest hill of Saint-Honoré.', C.white));
  print(colorize('  A butler in white gloves meets you at the door.', C.white));
  print();

  printDialogue('Butler', "The Governor is not available, Inspector. However, you may speak with Ms. Harmon, his aide.");
  print();

  const items = [
    {
      label: 'Interview Patricia Harmon (Governor\'s Aide)',
      description: 'Patricia is polished and professional. "Selina Artwell was at the cocktail party but left early — around 9:30. She didn\'t say goodbye, which was unusual. She seemed preoccupied."',
      clue: 'Governor\'s aide: Selina left cocktail party at 9:30 PM, seemed preoccupied',
      evidence: 'Witness confirms Selina left party at 9:30, not 11 PM',
    },
    {
      label: 'Check the mansion gate CCTV',
      description: 'You request the gate camera footage. The mansion security grudgingly provides it. Clear as day: Selina Artwell\'s silver Mercedes exits the gate at 9:27 PM. She said 11 PM.',
      evidence: 'Mansion CCTV: Selina\'s silver Mercedes left at 9:27 PM',
    },
    {
      label: 'Ask about Victor Pearce\'s connections',
      description: 'Patricia hesitates, then says: "Victor Pearce met with the Governor twice. Business meetings, I was told. But I wasn\'t included. Very hush-hush." She seems nervous about saying more.',
      clue: 'Victor had secret meetings with the Governor — hush-hush',
    },
    {
      label: 'Explore the mansion gardens',
      description: 'The gardens are immaculate. Near a gazebo, you find a crumpled cocktail napkin with writing on it: "V.P. knows about the transfers. Handle it. -H.D." The initials match Governor Henry Delacroix.',
      evidence: 'Note from "H.D.": "V.P. knows about the transfers. Handle it."',
      riddle: true,
      riddleContext: 'A gardener spots you and says: "That gazebo has a locked box under the bench. Solve this and I\'ll let you see what\'s inside."',
      riddleReward: 'Locked box contains list: Selina\'s property deals with Delacroix Holdings',
    },
  ];

  await investigateScene(1, "The Governor's Mansion", '', items);
}

async function case1ExploreDocks() {
  Terminal.clear();
  showLocation('docks');

  print(colorize('  The docks smell of salt, diesel, and fresh fish.', C.white));
  print(colorize('  Tommy Baptiste\'s boat, "La Belle Marie," is tied up at the far end.', C.white));
  print();

  const items = [
    {
      label: 'Inspect Tommy\'s boat',
      description: 'The boat is well-maintained but old. Under a tarp, you find a can of red spray paint — the same brand as the "GO HOME" graffiti at the beach house. Tommy\'s fingerprints will be all over it.',
      evidence: 'Red spray paint matching beach house graffiti found on Tommy\'s boat',
    },
    {
      label: 'Check the boat\'s GPS unit',
      description: 'Tommy said his GPS was broken. You check it — the unit is functional. The display is off because the fuse was pulled. You push it back in. The GPS log shows the boat was docked near the beach house from 10:50 PM to 11:20 PM.',
      evidence: 'Boat GPS: Tommy was at beach house area 10:50–11:20 PM',
      clue: 'Tommy lied — his GPS works fine and puts him at the scene',
    },
    {
      label: 'Talk to other fishermen',
      description: 'An old fisherman named Jacques says: "Tommy? He\'s no killer. But he was angry enough to do something stupid. Said he\'d scare Pearce off the island. I told him to leave it alone."',
      clue: 'Tommy planned to scare Victor off the island — not kill',
    },
    {
      label: 'Search the dock storage lockers',
      description: 'In the communal locker area, you find a pay-as-you-go phone in a plastic bag. One text message: "Il est mort. C\'est fait." (He\'s dead. It\'s done.) No sender ID. Time: 11:45 PM night of the murder.',
      evidence: 'Burner phone found: "He\'s dead. It\'s done." sent at 11:45 PM',
      riddle: true,
      riddleContext: 'The locker has a combination riddle scratched into the door...',
      riddleReward: 'Burner phone carrier trace links to a number registered near Governor\'s Mansion',
    },
  ];

  await investigateScene(1, 'The Docks', '', items);
}

async function case1ExploreMarket() {
  Terminal.clear();
  showLocation('market');

  print(colorize('  The market is alive with colour, sound, and the scent of spices.', C.white));
  print(colorize('  Catherine, the owner, knows everyone\'s business.', C.white));
  print();

  printDialogue('Catherine', "Inspector Carter! Come, come. I hear you\'re investigating the Pearce murder.");
  printDialogue('Catherine', "Sit down. Have some mango. I know things.");
  print();

  const items = [
    {
      label: 'Sit with Catherine and listen',
      description: 'Catherine leans in conspiratorially. "That Selina woman? She drives a silver Mercedes. I saw her flying down the beach road at 11:30 that night. Almost hit my cousin\'s goat! And she looked... frantic."',
      clue: 'Catherine: Selina\'s Mercedes speeding from beach at 11:30 PM',
    },
    {
      label: 'Ask about Roger Pearce',
      description: '"The son? He came to the market two days ago asking about lawyers. Wanted someone who handles wills and estates. I sent him to Whitmore in town. Seemed angry at his father."',
      clue: 'Roger was seeking estate lawyers before his father\'s death',
    },
    {
      label: 'Ask about Tommy Baptiste',
      description: '"Tommy is a good man. Gentle soul. But he was destroyed when Pearce announced the resort. The reef is his whole life. His father fished there, and his grandfather before that."',
      clue: 'The reef represents generations of Tommy\'s family heritage',
    },
    {
      label: 'Ask about the morning jogger',
      description: 'Catherine waves over Marie-Claire, the local teacher. "I jog every morning at 6 AM. That morning, I saw a silver Mercedes near the beach house. It left around 6:30. I thought it was odd — who\'s at the beach that early?"',
      evidence: 'Jogger: Silver Mercedes at beach house at 6 AM, left by 6:30',
    },
  ];

  await investigateScene(1, "Catherine's Market", '', items);
}

async function case1Interrogation() {
  Terminal.clear();
  printHeader('INTERROGATION ROOM');

  print(colorize(`
      ┌─────────────────────────────────┐
      │          💡                      │
      │     ┌─────────────┐             │
      │     │ INTERROGATION│             │
      │     │    ROOM      │             │
      │     └──────┬──────┘             │
      │     ┌──────┴──────┐             │
      │     │   🪑     🪑  │             │
      │     │      📋      │             │
      │     │   🪑     🪑  │             │
      │     └─────────────┘             │
      └─────────────────────────────────┘
  `, C.bCyan));

  print(colorize('  Who do you want to interrogate?', C.bold, C.white));
  print();

  const suspects = case1Characters.suspects;
  const keys = Object.keys(suspects);

  keys.forEach((key, i) => {
    const s = suspects[key];
    const already = wasInterrogated(1, s.name) ? colorize(' (already questioned)', C.dim) : '';
    printChoice(i + 1, `${s.name} — ${s.occupation}${already}`);
  });
  printChoice(keys.length + 1, 'Go back');

  const choice = await getPlayerChoice(keys.length + 1);
  if (choice === keys.length + 1) return;

  const key = keys[choice - 1];
  await interrogate(1, key, case1Characters);
}

async function case1Witness() {
  Terminal.clear();
  printSubHeader('WITNESS INTERVIEWS');
  print();
  print(colorize('  Who do you want to interview?', C.bold, C.white));
  print();

  const witnesses = case1Characters.witnesses;
  const keys = Object.keys(witnesses);

  keys.forEach((key, i) => {
    const w = witnesses[key];
    const already = getFlag(`case1_witness_${key}`) ? colorize(' (interviewed)', C.dim) : '';
    printChoice(i + 1, `${w.name} — ${w.occupation}${already}`);
  });
  printChoice(keys.length + 1, 'Go back');

  const choice = await getPlayerChoice(keys.length + 1);
  if (choice === keys.length + 1) return;

  const key = keys[choice - 1];
  const witness = witnesses[key];
  setFlag(`case1_witness_${key}`);

  print();
  printHeader(`WITNESS: ${witness.name.toUpperCase()}`);
  print(colorize(`  ${witness.occupation}`, C.dim));
  print();

  printDialogue(witness.name.split(' ')[0], witness.testimony);
  print();

  addClue(1, witness.revealsClue);
  print();

  // Some witnesses trigger follow-up options
  if (key === 'early_jogger') {
    print();
    printDialogue('You', "A silver Mercedes... Can you describe the driver?");
    printDialogue('Marie-Claire', "I couldn't see clearly. But it was a woman, I think. The car was very clean, very expensive.");
    addClue(1, 'Morning jogger: female driver in silver Mercedes at dawn');
  }

  if (key === 'governor_aide') {
    print();
    printDialogue('You', "Did Selina say where she was going?");
    printDialogue('Patricia', "No. She just... left. But she was on her phone. Looked upset. I assumed it was a business call.");
    addClue(1, 'Selina was on phone call when leaving party early');
  }

  await pressEnter();
}

async function case2() {
  // ============================================================================
  //  CASE 2: THE POISONED RUM PUNCH
  // ============================================================================

  Terminal.clear();
  print(colorize(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║    ☠  C A S E   2 :  T H E   P O I S O N E D  ☠       ║
  ║              R U M   P U N C H                           ║
  ║                                                          ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Victim: Chef Antoine Beaumont, 48, Celebrity Chef       ║
  ║  Found : The Rum Shack, 9:30 PM                          ║
  ║  Cause : Cyanide poisoning                                ║
  ║  Method: Poison in his signature rum punch                ║
  ╚══════════════════════════════════════════════════════════╝
  `, C.bold, C.bRed));

  print(case2Characters.victim.art);
  print();

  await printSlow(colorize('  It was supposed to be a quiet evening at the Rum Shack.', C.white), 18);
  await printSlow(colorize('  Chef Antoine Beaumont sat at his usual spot, sipping rum punch.', C.white), 18);
  await printSlow(colorize('  Then, mid-sentence, he gasped — clutched his throat — and collapsed.', C.bRed), 18);
  print();

  printDialogue('Pete the Barman', "He just... fell! One second he was laughing, the next...");
  printDialogue('Camille', "Cyanide. I can smell it on the glass. Bitter almonds.");
  printDialogue('JP', "Sir, cyanide acts in minutes. Whoever poisoned this drink did it recently.");
  printDialogue('Dwayne', "Antoine Beaumont was the most famous chef in the Caribbean. Everyone knew him.");
  printDialogue('Dwayne', "And not everyone liked him.");
  print();

  await pressEnter();

  // ─── PHASE 1: CRIME SCENE — THE RUM SHACK ───
  Terminal.clear();
  printHeader('CRIME SCENE: THE RUM SHACK');

  const RUM_SHACK_CRIME_ART = `${colorize(`
      ┌────────────────────────────────────┐
      │  🍹 THE RUM SHACK — CRIME SCENE 🍹 │
      ├────────────────────────────────────┤
      │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐        │
      │  │🥃│ │☠️│ │🥃│ │🍹│ │🍺│        │
      │  └──┘ └──┘ └──┘ └──┘ └──┘        │
      │   ═══════BAR═══════════           │
      │   🪑 [BODY] 🪑    🪑  🪑         │
      │   ⛔ CRIME SCENE ⛔               │
      └────────────────────────────────────┘
  `, C.bYellow)}`;

  print(RUM_SHACK_CRIME_ART);
  print();
  print(colorize('  Antoine lies crumpled next to his bar stool. The half-empty', C.white));
  print(colorize('  rum punch glass sits on the bar, a film of residue inside.', C.white));
  print(colorize('  The sharp scent of bitter almonds hangs in the tropical air.', C.white));
  print();

  await pressEnter();

  const crimeSceneItems = [
    {
      label: 'Examine the poisoned glass',
      description: 'The rum punch glass has a faint oily residue inside — consistent with potassium cyanide dissolved in liquid. The poison was added to this specific drink. The glass has smudged fingerprints — whoever poured the poison wiped it, but not perfectly.',
      clue: 'Poison was dissolved in this specific glass — partial wiped prints',
      evidence: 'Poisoned rum punch glass with partial fingerprints',
    },
    {
      label: 'Check the bar area behind the counter',
      description: 'Behind the bar, Pete keeps things tidy. But in the bin: a small crushed glass vial with traces of white powder. It\'s been hastily wrapped in a cocktail napkin. The poison container.',
      evidence: 'Crushed glass vial with cyanide residue found in bar bin',
    },
    {
      label: 'Examine Antoine\'s personal effects',
      description: 'Antoine\'s phone shows 3 missed calls from "Nadia" and a text from "E" at 8:10 PM: "I\'m bringing your first drink tonight. Our special. ❤️" Also in his pocket: a receipt from a jewelry shop — an engagement ring. £8,000.',
      clue: 'Antoine bought an engagement ring — not for his wife',
      evidence: 'Text from Elena: "bringing your first drink tonight"',
    },
    {
      label: 'Interview Pete the barman about the timeline',
      description: 'Pete recounts the evening carefully: "Elena brought his first drink at 8:15. She left right after. I made him two more after that. Then around 9, his wife Nadia came by — dropped off his jacket she said he forgot. She leaned over the bar near his drink for a moment. Then at 9:25... he collapsed."',
      clue: 'Timeline: Elena 8:15 → Pete serves 2 more → Nadia arrives 9PM → death 9:25',
      evidence: 'Barman testimony: Nadia was near Antoine\'s drink at 9 PM',
    },
    {
      label: 'Search the area around Antoine\'s stool',
      description: 'Under the stool, JP finds a blue jacket — the one Nadia brought. Inside the pocket: a folded note reading "I know what you did. Meet me or I\'ll tell everything. -K.B." The initials K.B...',
      evidence: 'Threatening note in jacket pocket: "I know what you did. -K.B."',
      clue: 'Someone with initials K.B. was blackmailing Antoine — or Nadia?',
    },
    {
      label: 'Check if anyone else handled Antoine\'s drink',
      description: 'You ask Pete to think very carefully. "After Elena left, I served him twice myself. No one else touched his drinks... except when Nadia came. She set the jacket on the bar right next to his glass. I turned to get her a water. When I turned back, she was leaving." That 10-second window was enough.',
      clue: 'Nadia had a 10-second window alone with Antoine\'s drink at 9 PM',
    },
  ];

  await investigateScene(2, 'The Rum Shack Crime Scene', RUM_SHACK_CRIME_ART, crimeSceneItems);

  // ─── TRANSITION: THE TEAM REGROUPS ───
  Terminal.clear();
  gameState.currentLocation = 'police_station';
  printHeader('BACK AT THE STATION');
  print(POLICE_STATION_ART);
  print();

  printDialogue('Camille', "Cyanide poisoning. Premeditated. Someone planned this carefully.");
  printDialogue('JP', "Sir, I pulled the toxicology — potassium cyanide. Fast-acting. He had no chance.");
  printDialogue('Dwayne', "Antoine had enemies in the kitchen, in love, and in business. This island is drowning in suspects.");
  print();

  // Conspiracy thread hint if player trusted Madeleine
  if (gameState.decisions.trustedMadeleine) {
    printDialogue('Camille', "Inspector... those initials on the note — K.B. Remember Madeleine's files? Karl Brandt. He works for the Governor.");
    addClue(2, 'K.B. initials may match Karl Brandt — Governor\'s security man');
    gameState.score += 10;
  }

  await teamDiscussion(2);

  // ─── PHASE 2: INVESTIGATION HUB ───
  let case2Done = false;
  let actionsRemaining = 12;

  while (!case2Done && actionsRemaining > 0) {
    Terminal.clear();
    printHeader('CASE 2: INVESTIGATION');
    print(colorize(`  ⏱  Actions remaining: ${actionsRemaining}`, actionsRemaining <= 3 ? C.bRed : C.bYellow));
    print(colorize(`  📍 Current location: ${locations[gameState.currentLocation].name}`, C.dim));
    print();

    printChoice(1, 'Travel to a location', '(explore & find clues)');
    printChoice(2, 'Interrogate a suspect', '(question them at the station)');
    printChoice(3, 'Interview a witness', '(gather testimony)');
    printChoice(4, 'Team discussion', '(review evidence with your team)');
    printChoice(5, 'Solve a riddle', '(bonus clue opportunity)');
    printChoice(6, 'Make your accusation', '(end the case)');
    print();
    print(colorize('  Also available: map, inventory, evidence, help', C.dim));
    print();

    const mainChoice = await getPlayerChoice(6);

    if (mainChoice === 1) {
      await case2Explore();
      actionsRemaining--;
    } else if (mainChoice === 2) {
      await case2Interrogation();
      actionsRemaining--;
    } else if (mainChoice === 3) {
      await case2Witness();
      actionsRemaining--;
    } else if (mainChoice === 4) {
      await teamDiscussion(2);
    } else if (mainChoice === 5) {
      const solved = await presentRiddle('A mysterious street performer blocks your path. "Answer my riddle and I\'ll tell you what I saw that night..."');
      if (solved) {
        addClue(2, 'Street performer saw Nadia dumping something in a harbour bin at 9:10 PM');
        printSuccess('The performer shares a crucial sighting!');
      }
      actionsRemaining--;
      await pressEnter();
    } else if (mainChoice === 6) {
      print();
      print(colorize('  Are you sure you want to make your accusation now?', C.bYellow));
      print(colorize(`  You have ${gameState.clues.case2.length} clues and ${gameState.evidence.case2.length} pieces of evidence.`, C.dim));
      print();
      printChoice(1, 'Yes — I know who did it');
      printChoice(2, 'No — I need more time');
      const confirmAccuse = await getPlayerChoice(2);
      if (confirmAccuse === 1) {
        case2Done = true;
      }
    }
  }

  if (actionsRemaining <= 0 && !case2Done) {
    Terminal.clear();
    printAlert('TIME IS UP!');
    print();
    await printSlow(colorize('  The press is hounding the station. A celebrity chef murdered — the world is watching.', C.white), 18);
    printDialogue('Camille', "Inspector, we need an arrest. Now.");
    print();
    await pressEnter();
  }

  // ─── THE ACCUSATION ───
  const case2Correct = await makeAccusation(2, case2Characters);

  // ─── POST-CASE 2 — THE WITNESS DECISION ───
  Terminal.clear();
  print(colorize(`
  ╔══════════════════════════════════════════════════════════╗
  ║                  CASE 2 — CLOSED                        ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Score so far: ${String(gameState.score).padEnd(39)}║
  ║  Clues found: ${String(gameState.clues.case2.length).padEnd(40)}║
  ║  Evidence collected: ${String(gameState.evidence.case2.length).padEnd(34)}║
  ║  Correct accusation: ${(case2Correct ? 'YES ★' : 'NO').padEnd(33)}║
  ╚══════════════════════════════════════════════════════════╝
  `, C.bold, C.bCyan));

  await pressEnter();

  // ─── THE WITNESS DECISION ───
  Terminal.clear();
  printHeader('A LATE-NIGHT VISIT');
  print();

  await printSlow(colorize('  It is past midnight. You are at the station alone, writing reports.', C.white), 20);
  await printSlow(colorize('  A knock at the door. Hesitant. Afraid.', C.white), 20);
  print();

  printDialogue('???', "Inspector Carter? Please... I need your help.");
  print();
  await printSlow(colorize('  A young man steps inside. Pale, trembling.', C.white), 20);
  await printSlow(colorize('  He introduces himself as Léon Samuels, journalist.', C.white), 20);
  print();

  printDialogue('Léon', "I've been investigating Governor Delacroix. Corruption. Embezzlement.");
  printDialogue('Léon', "Commissioner Thorne from London — he was helping me. We had evidence.");
  printDialogue('Léon', "But tonight... someone broke into my room. Stole my backup files.");
  printDialogue('Léon', "I think they're going to kill Thorne next. Or me.");
  print();

  printNarration('Léon looks over his shoulder, terrified.');
  print();

  printChoice(1, 'Offer him protection at the station — save the witness');
  printChoice(2, 'Tell him to go to the authorities in Guadeloupe — too dangerous');

  const witnessChoice = await getPlayerChoice(2);
  print();

  if (witnessChoice === 1) {
    gameState.decisions.savedTheWitness = true;
    printDialogue('You', "Stay here tonight. I'll put Dwayne on the door. No one gets in.");
    printDialogue('Léon', "Thank you, Inspector. Thank you. I'll tell you everything I know.");
    printNarration('Léon curls up on the station sofa. You call Dwayne.');
    addClue(2, 'Léon Samuels has evidence of Governor\'s corruption — under your protection');
    setFlag('leon_protected');
    gameState.score += 20;
  } else {
    printDialogue('You', "This is bigger than my jurisdiction. Go to Guadeloupe. Take the ferry at dawn.");
    printDialogue('Léon', "But... if I leave, they'll destroy the evidence! Thorne is in danger!");
    printDialogue('You', "I'll look into it. But you need to be safe first.");
    printNarration('Léon leaves reluctantly, disappearing into the dark streets.');
    setFlag('leon_sent_away');
  }

  print();
  await pressEnter();

  // ─── TRANSITION TO CASE 3 ───
  Terminal.clear();
  print();
  await printSlow(colorize('  Three days later.', C.bold, C.bWhite), 30);
  print();

  if (gameState.decisions.savedTheWitness) {
    await printSlow(colorize('  Léon has been sharing everything he knows. The conspiracy runs deep.', C.white), 20);
    await printSlow(colorize('  Shell companies. Diverted hurricane relief funds. The Governor at the centre.', C.white), 20);
  } else {
    await printSlow(colorize('  You haven\'t heard from Léon. The ferry records show he never boarded.', C.bRed), 20);
    await printSlow(colorize('  A knot forms in your stomach.', C.white), 20);
  }

  print();
  await printSlow(colorize('  Then, early one morning, your phone rings.', C.white), 20);
  print();
  printDialogue('JP', "Sir! Sir! There's a body at the old lighthouse!");
  printDialogue('JP', "It's... it's Commissioner Thorne, sir. He's dead.");
  print();

  if (gameState.decisions.savedTheWitness) {
    printDialogue('Léon', "No... NO! They got to him! I told you! I told you!");
    printNarration('Léon slams his fist on the table, eyes wild with grief.');
  }

  print();
  printAlert('CASE 3: THE VANISHING WITNESS');
  print();

  await pressEnter();
  gameState.currentCase = 3;
}

// ─── Case 2 Sub-Functions ───

async function case2Explore() {
  Terminal.clear();
  printSubHeader('WHERE DO YOU WANT TO INVESTIGATE?');
  print();

  const explorable = [
    { id: 'rum_shack', label: 'The Rum Shack — re-examine the crime scene' },
    { id: 'plantation', label: 'La Fontaine Plantation — where Nadia was at the spa' },
    { id: 'market', label: "Catherine's Market — where Marcus says he was shopping" },
    { id: 'honore_beach', label: 'Honoré Beach — where Elena says she was at home' },
    { id: 'docks', label: 'The Docks — check for incoming chemical shipments' },
    { id: 'jungle_trail', label: 'The Jungle Trail — hidden meeting spot' },
  ];

  explorable.forEach((loc, i) => {
    const visited = getFlag(`case2_explored_${loc.id}`) ? colorize(' (explored)', C.dim) : '';
    printChoice(i + 1, loc.label + visited);
  });
  printChoice(7, 'Go back');

  const choice = await getPlayerChoice(7);
  if (choice === 7) return;

  const dest = explorable[choice - 1];
  gameState.currentLocation = dest.id;
  setFlag(`case2_explored_${dest.id}`);

  if (dest.id === 'rum_shack') await case2ExploreRumShack();
  else if (dest.id === 'plantation') await case2ExplorePlantation();
  else if (dest.id === 'market') await case2ExploreMarket();
  else if (dest.id === 'honore_beach') await case2ExploreBeach();
  else if (dest.id === 'docks') await case2ExploreDocks();
  else if (dest.id === 'jungle_trail') await case2ExploreJungle();
}

async function case2ExploreRumShack() {
  Terminal.clear();
  showLocation('rum_shack');
  print(colorize('  The Rum Shack is still cordoned off. The scent of rum and sadness.', C.white));
  print();

  const items = [
    {
      label: 'Re-examine the bar counter',
      description: 'You look more closely at the bar surface where Nadia set down the jacket. There\'s a faint circular mark — like a glass ring — but also a small dusting of white powder caught in a scratch in the wood. Cyanide residue. Someone opened a container here.',
      evidence: 'Cyanide powder residue found on bar where Nadia placed jacket',
    },
    {
      label: 'Check CCTV footage from the bar',
      description: 'The Rum Shack camera angle is poor but shows the bar from a side view. At 9:01 PM, a woman approaches — Nadia. She sets a jacket on the bar. Pete turns away. For exactly 7 seconds, her right hand moves near the glass. Then she\'s gone.',
      evidence: 'CCTV: Nadia\'s hand near Antoine\'s glass for 7 seconds while Pete turned',
    },
    {
      label: 'Search Antoine\'s favourite booth',
      description: 'In the booth where Antoine often sat for dinner, you find a note scratched into the wooden table: "N knows about E. Be careful. -F." François was warning Antoine that Nadia knew about Elena.',
      clue: 'François warned Antoine that Nadia knew about the affair',
    },
    {
      label: 'Interview the evening musician',
      description: 'The steel band player, Marcus "Steelpan" Pierre, was performing that night. "The wife came in. She didn\'t say hello to the husband at all — just put a jacket down, real calm, and walked out. Cold, man. Cold as ice."',
      clue: 'Musician: Nadia was eerily calm — didn\'t greet Antoine, just left the jacket',
    },
  ];

  await investigateScene(2, 'Rum Shack (Revisited)', '', items);
}

async function case2ExplorePlantation() {
  Terminal.clear();
  showLocation('plantation');
  print(colorize('  La Fontaine Plantation\'s spa is a serene oasis of calm.', C.white));
  print(colorize('  But secrets hide behind the scented candles.', C.white));
  print();

  const items = [
    {
      label: 'Interview Sophie the spa manager',
      description: 'Sophie checks her records. "Nadia Beaumont had a 7 PM massage. She left at 7:45. We close at 8. She said she was going for a walk on the grounds." That gives Nadia over an hour before she appeared at the Rum Shack.',
      clue: 'Spa confirms: Nadia left at 7:45 PM — over 1 hour unaccounted before 9 PM',
      evidence: 'Spa records: Nadia\'s appointment ended 7:45 PM',
    },
    {
      label: 'Check the hotel rooms for cyanide purchase records',
      description: 'With a warrant, you access the hotel\'s WiFi logs. Nadia\'s phone connected to the hotel network 3 weeks ago and accessed a chemical supply website. JP traces the order — 50g potassium cyanide, shipped to "N. Beaumont, La Fontaine Hotel."',
      evidence: 'WiFi logs: Nadia ordered 50g potassium cyanide to the hotel 3 weeks ago',
    },
    {
      label: 'Search the hotel room Nadia was staying in',
      description: 'In Nadia\'s room: a locked suitcase under the bed. JP manages to open it. Inside: Antoine\'s life insurance papers (£2 million to Nadia as beneficiary), printouts about cyanide dosage, and a pair of latex gloves.',
      evidence: 'Nadia\'s suitcase: insurance papers, cyanide research, latex gloves',
    },
    {
      label: 'Talk to the plantation gardener',
      description: 'The gardener was trimming hedges at 8:30 PM. "I saw Madame Beaumont walking through the garden toward the main road. She was carrying a blue jacket and a small bag. She looked very... determined."',
      clue: 'Gardener: Nadia left at 8:30 with blue jacket and a small bag',
      riddle: true,
      riddleContext: 'The gardener wants to be sure you\'re a real detective. "Solve this and I\'ll tell you which direction she went..."',
      riddleReward: 'Gardener: Nadia headed toward the Rum Shack, not the beach',
    },
  ];

  await investigateScene(2, 'La Fontaine Spa & Hotel', '', items);
}

async function case2ExploreMarket() {
  Terminal.clear();
  showLocation('market');
  print(colorize('  Catherine\'s Market is closed for the night, but Catherine herself', C.white));
  print(colorize('  is stacking crates and happy to talk.', C.white));
  print();

  const items = [
    {
      label: 'Ask Catherine about Marcus Chen',
      description: 'Catherine nods. "Marcus was here. Shopping for Le Paradis. Normal order — fish, limes, spices. But he had a phone call around 8 PM. Got very heated. Shouting about a recipe. Left at 8:30."',
      clue: 'Catherine confirms: Marcus at market until 8:30, angry phone call at 8',
    },
    {
      label: 'Check if anyone at the market sells chemicals',
      description: 'You ask about cyanide or chemical sales. Catherine looks horrified. "Nobody here sells poison, Inspector! Although... a package was delivered here by mistake three weeks ago. For N. Beaumont. I redirected it to the hotel."',
      evidence: 'Catherine confirms: cyanide package for Nadia was mistakenly delivered to market',
    },
    {
      label: 'Ask about François Dupont',
      description: '"François? Poor man. His restaurant is dying. No customers since Antoine stole his staff. He closed Chez François early that night — around 7. I saw him walk home alone. He looked... defeated."',
      clue: 'Catherine: François closed restaurant at 7 PM, walked home defeated',
    },
    {
      label: 'Ask about any unusual visitors lately',
      description: 'Catherine lowers her voice. "A big man. German, I think. Very military. He\'s been meeting people in the alley behind the market. Three times this week. Karl something. Works for the Governor."',
      clue: 'Catherine: Karl Brandt holding secret meetings behind the market',
    },
  ];

  await investigateScene(2, "Catherine's Market", '', items);
}

async function case2ExploreBeach() {
  Terminal.clear();
  showLocation('honore_beach');
  print(colorize('  Elena Vasquez\'s modest beach cottage is nearby. She answers', C.white));
  print(colorize('  the door with red eyes — she\'s been crying.', C.white));
  print();

  const items = [
    {
      label: 'Search Elena\'s cottage (with permission)',
      description: 'Elena lets you look. The cottage is small and tidy. On her nightstand: love letters from Antoine, a photo of them together, and a jewelry box — empty. "He said he was buying me a ring," she whispers.',
      clue: 'Elena genuinely loved Antoine and was expecting a proposal',
    },
    {
      label: 'Check Elena\'s phone records',
      description: 'Elena hands over her phone willingly. Text to Antoine at 8:10 PM: "I\'m bringing your first drink tonight. Our special. ❤️" Then at 9:00 PM she texted: "Miss you already." She was at home by then. Call log confirms a 20-minute call with her mother in Guadeloupe from 8:40 to 9:00.',
      evidence: 'Elena\'s phone records: call with mother 8:40-9:00 PM, alibi confirmed at home',
    },
    {
      label: 'Walk to the beach bar where Elena worked',
      description: 'The small beach bar where Elena worked before joining Le Paradis. The owner says: "Elena is good people. She fell for Antoine hard. He was charming. But his wife? That woman has ice water in her veins."',
      clue: 'Beach bar owner: Nadia is cold and calculating',
    },
    {
      label: 'Ask Elena about Nadia',
      description: 'Elena\'s face hardens. "Nadia knew. About us. She found out a month ago. Antoine said she was calm about it — too calm. She didn\'t scream or cry. She just said \'I see.\' That scared him more than any argument."',
      clue: 'Elena: Nadia discovered the affair a month ago and was unnervingly calm',
    },
  ];

  await investigateScene(2, "Elena's Cottage", '', items);
}

async function case2ExploreDocks() {
  Terminal.clear();
  showLocation('docks');
  print(colorize('  The docks are quiet at night. A single lamp illuminates', C.white));
  print(colorize('  the harbour master\'s office.', C.white));
  print();

  const items = [
    {
      label: 'Check shipping manifests for chemical deliveries',
      description: 'The harbour master pulls records. Three weeks ago, a small package from a chemical supplier in Martinique arrived via ferry. Addressed to "N. Beaumont, c/o Catherine\'s Market." Declared contents: "Jewelry cleaning solution."',
      evidence: 'Shipping manifest: cyanide shipped as "jewelry cleaner" to Nadia',
    },
    {
      label: 'Ask about any suspicious boat activity',
      description: 'A dock worker mentions a black speedboat that\'s been coming and going at odd hours. "No registration. Tinted windows. Comes from the direction of Guadeloupe. The big German bloke meets it sometimes."',
      clue: 'Unregistered speedboat meets Karl Brandt at the docks regularly',
    },
    {
      label: 'Search the harbour waste bins',
      description: 'In a rusted bin near the dock: a crumpled receipt from a pharmacy in Martinique for "potassium cyanide — 50g — industrial cleaning" dated three weeks ago. The name on the receipt has been torn off, but the credit card last four digits are visible: 4471.',
      evidence: 'Pharmacy receipt for cyanide — credit card ending 4471',
      riddle: true,
      riddleContext: 'The dock manager has information but loves puzzles. "Figure this out and I\'ll cross-reference that credit card number for you..."',
      riddleReward: 'Credit card 4471 belongs to Nadia Beaumont\'s personal account',
    },
    {
      label: 'Talk to the ferry captain',
      description: 'The ferry captain says: "François Dupont tried to book a one-way ticket to Guadeloupe for tomorrow morning. Changed his mind at the last second. Said \'I\'m not running.\' Seemed scared, not guilty."',
      clue: 'François considered fleeing but changed his mind — scared but innocent',
    },
  ];

  await investigateScene(2, 'The Docks', '', items);
}

async function case2ExploreJungle() {
  Terminal.clear();
  showLocation('jungle_trail');
  print(colorize('  The jungle trail is dark and humid. Ferns brush against', C.white));
  print(colorize('  your arms. Something rustles in the undergrowth.', C.white));
  print();

  printDialogue('Dwayne', "Careful in here, Inspector. People come to the jungle when they don't want to be found.");
  print();

  const items = [
    {
      label: 'Follow a fresh trail off the main path',
      description: 'Fresh boot prints lead to a clearing. In the centre: a burnt patch where someone destroyed documents. Fragments remain — you can make out "Delacroix Holdings," "Transfer Ref," and "Karl Br—". Someone is burning evidence.',
      evidence: 'Burnt documents in jungle: references to Delacroix Holdings and Karl Brandt',
    },
    {
      label: 'Search an old hunter\'s blind',
      description: 'A wooden platform hidden in the trees. Someone has been using it as a meeting spot. Empty rum bottles, cigarette butts, and a burner phone smashed to pieces. Camille finds a matchbook from "Chez François" restaurant.',
      clue: 'Meeting spot in jungle — matchbook from François\'s restaurant found',
    },
    {
      label: 'Examine scratch marks on a tree',
      description: 'Deep gouges in a mahogany tree — not animal marks. Letters carved recently: "KGB WAS HERE." You realize — K.B. Not KGB. Someone carved Karl Brandt\'s initials. A territorial mark or a warning.',
      clue: 'Karl Brandt\'s initials carved into jungle trees — marking territory',
    },
    {
      label: 'Follow strange sounds deeper into jungle',
      description: 'You push deeper and find a small cave mouth. Inside: crates marked with a shipping company from Venezuela. They\'re empty now, but residue suggests they once held something heavy — possibly weapons or money. This is a smuggling route.',
      evidence: 'Smuggling cave in jungle — shipping crates from Venezuela',
      clue: 'The island has an active smuggling operation through the jungle',
    },
  ];

  await investigateScene(2, 'The Jungle Trail', '', items);
}

async function case2Interrogation() {
  Terminal.clear();
  printHeader('INTERROGATION ROOM');

  print(colorize(`
      ┌─────────────────────────────────┐
      │          💡                      │
      │     ┌─────────────┐             │
      │     │ INTERROGATION│             │
      │     │    ROOM      │             │
      │     └──────┬──────┘             │
      │     ┌──────┴──────┐             │
      │     │   🪑     🪑  │             │
      │     │      📋      │             │
      │     │   🪑     🪑  │             │
      │     └─────────────┘             │
      └─────────────────────────────────┘
  `, C.bCyan));

  print(colorize('  Who do you want to interrogate?', C.bold, C.white));
  print();

  const suspects = case2Characters.suspects;
  const keys = Object.keys(suspects);

  keys.forEach((key, i) => {
    const s = suspects[key];
    const already = wasInterrogated(2, s.name) ? colorize(' (already questioned)', C.dim) : '';
    printChoice(i + 1, `${s.name} — ${s.occupation}${already}`);
  });
  printChoice(keys.length + 1, 'Go back');

  const choice = await getPlayerChoice(keys.length + 1);
  if (choice === keys.length + 1) return;

  const key = keys[choice - 1];
  await interrogate(2, key, case2Characters);
}

async function case2Witness() {
  Terminal.clear();
  printSubHeader('WITNESS INTERVIEWS');
  print();
  print(colorize('  Who do you want to interview?', C.bold, C.white));
  print();

  const witnesses = case2Characters.witnesses;
  const keys = Object.keys(witnesses);

  keys.forEach((key, i) => {
    const w = witnesses[key];
    const already = getFlag(`case2_witness_${key}`) ? colorize(' (interviewed)', C.dim) : '';
    printChoice(i + 1, `${w.name} — ${w.occupation}${already}`);
  });
  printChoice(keys.length + 1, 'Go back');

  const choice = await getPlayerChoice(keys.length + 1);
  if (choice === keys.length + 1) return;

  const key = keys[choice - 1];
  const witness = witnesses[key];
  setFlag(`case2_witness_${key}`);

  print();
  printHeader(`WITNESS: ${witness.name.toUpperCase()}`);
  print(colorize(`  ${witness.occupation}`, C.dim));
  print();

  printDialogue(witness.name.split(' ')[0], witness.testimony);
  print();

  addClue(2, witness.revealsClue);

  // Follow-up insights
  if (key === 'barman_pete') {
    print();
    printDialogue('You', "When Nadia set the jacket down, was she carrying anything else?");
    printDialogue('Pete', "Now that you mention it... she had a small clutch bag. She opened it while I was turned away. I thought she was checking her phone.");
    addClue(2, 'Pete: Nadia opened her clutch bag near Antoine\'s drink');
  }

  if (key === 'delivery_boy') {
    print();
    printDialogue('You', "You said she seemed calm. How calm?");
    printDialogue('Junior', "Like she was going to the shops, man. Not like she was visiting her husband. No emotion at all. Cold.");
    addClue(2, 'Junior: Nadia was unnervingly calm walking to the Rum Shack');
  }

  if (key === 'spa_manager') {
    print();
    printDialogue('You', "Did Nadia seem distressed after her massage?");
    printDialogue('Sophie', "The opposite. She was... serene. Almost too peaceful. Like she'd made a decision about something.");
    addClue(2, 'Spa manager: Nadia was eerily serene after her spa session');
  }

  await pressEnter();
}

async function case3() {
  // ============================================================================
  //  CASE 3: THE VANISHING WITNESS
  // ============================================================================

  Terminal.clear();
  print(colorize(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║     ☠  C A S E   3 :  T H E   V A N I S H I N G  ☠    ║
  ║                  W I T N E S S                           ║
  ║                                                          ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Victim: Commissioner James Thorne, 62                   ║
  ║  Found : The Old Lighthouse, 6:00 AM                     ║
  ║  Cause : Blunt force trauma to the head                  ║
  ║  Weapon: Heavy brass telescope                           ║
  ╚══════════════════════════════════════════════════════════╝
  `, C.bold, C.bRed));

  print(case3Characters.victim.art);
  print();

  await printSlow(colorize('  The old lighthouse stands dark against the dawn sky.', C.white), 18);
  await printSlow(colorize('  Commissioner James Thorne lies at the base of the spiral staircase.', C.white), 18);
  await printSlow(colorize('  A heavy brass telescope — an antique — rests beside him, bloodied.', C.bRed), 18);
  print();

  printDialogue('JP', "Sir, the lighthouse has been abandoned for years. Why was he here?");
  printDialogue('Camille', "He was meeting someone. Someone he trusted enough to come alone.");

  if (gameState.decisions.savedTheWitness) {
    printDialogue('Léon', "He was investigating the Governor! He told me he had one more meeting — 'the one that would blow it all open.'");
    addClue(3, 'Thorne told Léon he had one final meeting that would expose everything');
  } else {
    printDialogue('Dwayne', "Inspector... that journalist, Léon? Nobody's seen him since that night he came to you.");
    printNarration('A cold feeling settles in your chest.');
    addClue(3, 'Léon Samuels has vanished — never boarded the ferry');
  }

  printDialogue('Dwayne', "This one's big, Inspector. Thorne was from London. The British government will be watching.");
  print();

  await pressEnter();

  // ─── PHASE 1: CRIME SCENE — THE LIGHTHOUSE ───
  Terminal.clear();
  printHeader('CRIME SCENE: THE OLD LIGHTHOUSE');

  const LIGHTHOUSE_CRIME_ART = `${colorize(`
              ╔══╗
              ║💀║
              ╠══╣
              │🩸│
             ┌┤  ├┐
             │├──┤│    ⛔ CRIME SCENE
             │├──┤│
             │├──┤│
            ┌┤├──┤├┐
            │└┤🩸├┘│   [BODY FOUND HERE]
            └─┴──┴─┘
         🪨  🪨 ≈≈≈≈  🪨
  `, C.bRed)}`;

  print(LIGHTHOUSE_CRIME_ART);
  print();
  print(colorize('  The lighthouse interior is dusty and damp. A spiral staircase', C.white));
  print(colorize('  leads to the lamp room. Thorne lies at the bottom — struck from', C.white));
  print(colorize('  behind. The brass telescope is an antique that was mounted upstairs.', C.white));
  print();

  await pressEnter();

  const crimeSceneItems = [
    {
      label: 'Examine the body',
      description: 'Commissioner Thorne, 62. Single heavy blow to the back of the skull. He was hit from behind — never saw it coming. His watch stopped at 12:17 AM. His jacket is torn as if he struggled after the initial blow. Under his fingernails: fibres — dark green, military-grade fabric.',
      clue: 'Time of death: 12:17 AM. Green military fibres under nails',
      evidence: 'Green military fibres from under Thorne\'s fingernails',
    },
    {
      label: 'Examine the brass telescope (murder weapon)',
      description: 'The heavy antique telescope was mounted on the observation deck. It was wrenched free and carried downstairs — this required significant strength. Partial fingerprints on the handle. A smudge of boot polish on the base.',
      evidence: 'Partial fingerprints and boot polish on murder weapon',
      clue: 'Killer had significant strength — prised telescope from its mount',
    },
    {
      label: 'Search the spiral staircase',
      description: 'On the third step from the bottom: a muddy boot print. Military-style sole pattern. Size 12 — a large man. The mud contains traces of red clay — found only on the road near the Governor\'s Mansion.',
      evidence: 'Military boot print size 12 — mud contains red clay from Governor\'s Mansion road',
    },
    {
      label: 'Check the lamp room at the top',
      description: 'The observation deck has been disturbed. The telescope mount is wrenched free. On the floor: a crumpled photograph of Thorne with a young woman — perhaps his secret daughter. And a USB flash drive, hidden in a crack behind the mount. Thorne hid this before he died.',
      evidence: 'USB flash drive hidden by Thorne — potential corruption evidence',
      clue: 'Thorne hid a USB drive before his death — he knew he was in danger',
    },
    {
      label: 'Search the ground outside the lighthouse',
      description: 'Tire tracks in the mud outside — large vehicle, wide tread. The tracks come from the coastal road and return the same way. JP photographs them. They match a Range Rover pattern. Also: fresh cigarette butts — Gauloises brand, French.',
      evidence: 'Range Rover tire tracks outside lighthouse',
      clue: 'Cigarette butts (Gauloises) and Range Rover tracks at scene',
    },
    {
      label: 'Examine the lighthouse door lock',
      description: 'The old padlock on the lighthouse door has been picked — scratch marks around the keyhole from a professional lock-pick tool. This wasn\'t forced entry. It was skilled, methodical. Military or intelligence training.',
      clue: 'Lock professionally picked — military or intelligence skill',
    },
  ];

  await investigateScene(3, 'The Old Lighthouse Crime Scene', LIGHTHOUSE_CRIME_ART, crimeSceneItems);

  // ─── USB DRIVE ANALYSIS (if found) ───
  if (hasEvidence(3, 'USB flash drive hidden by Thorne — potential corruption evidence')) {
    Terminal.clear();
    printHeader('ANALYSING THE USB DRIVE');
    print();

    print(colorize(`
      ┌─────────────────────────────────────┐
      │         📁 USB DRIVE CONTENTS        │
      ├─────────────────────────────────────┤
      │                                       │
      │  📄 Delacroix_Holdings_Transfers.pdf  │
      │  📄 Shell_Company_Network.xlsx        │
      │  📄 Hurricane_Relief_Diversion.pdf    │
      │  📄 Karl_Brandt_Military_Record.pdf   │
      │  📄 Witness_Testimony_REDACTED.doc    │
      │  📄 FINAL_REPORT_DRAFT.pdf            │
      │                                       │
      └─────────────────────────────────────┘
    `, C.bGreen));

    print();
    await printSlow(colorize('  JP plugs the drive into the station computer. Your jaw drops.', C.white), 18);
    print();

    printDialogue('JP', "Sir... this is everything. Financial records. Shell companies. Money trails.");
    printDialogue('Camille', "Three million pounds of hurricane relief money — diverted to Delacroix Holdings.");
    printDialogue('Dwayne', "The Governor. All this time. Under our noses.");
    print();

    addEvidence(3, 'USB contains full financial records of Governor\'s embezzlement');
    addClue(3, 'Governor diverted £3M hurricane relief through shell companies');
    gameState.decisions.discoveredConspiracy = true;
    gameState.score += 30;

    if (gameState.decisions.trustedMadeleine) {
      printDialogue('Camille', "Inspector — Madeleine\'s files match perfectly. Selina was funnelling money TO the Governor.");
      addClue(3, 'Confirmed: Selina\'s property deals fed money into Governor\'s network');
    }

    await pressEnter();
  }

  // ─── TRANSITION: TEAM REGROUPS ───
  Terminal.clear();
  gameState.currentLocation = 'police_station';
  printHeader('BACK AT THE STATION');
  print(POLICE_STATION_ART);
  print();

  printDialogue('Camille', "This isn't just a murder anymore. This is a conspiracy.");
  printDialogue('Dwayne', "The Governor, Karl Brandt, the money... it all connects.");
  printDialogue('JP', "Sir, what do we do? The Governor is the most powerful man on the island.");
  print();

  await teamDiscussion(3);

  // ─── PHASE 2: INVESTIGATION HUB ───
  let case3Done = false;
  let actionsRemaining = 14;

  while (!case3Done && actionsRemaining > 0) {
    Terminal.clear();
    printHeader('CASE 3: INVESTIGATION');
    print(colorize(`  ⏱  Actions remaining: ${actionsRemaining}`, actionsRemaining <= 3 ? C.bRed : C.bYellow));
    print(colorize(`  📍 Current location: ${locations[gameState.currentLocation].name}`, C.dim));
    print();

    printChoice(1, 'Travel to a location', '(explore & find clues)');
    printChoice(2, 'Interrogate a suspect', '(question them at the station)');
    printChoice(3, 'Interview a witness', '(gather testimony)');
    printChoice(4, 'Team discussion', '(review evidence with your team)');
    printChoice(5, 'Solve a riddle', '(bonus clue opportunity)');
    printChoice(6, 'Make your accusation', '(end the case)');
    print();
    print(colorize('  Also available: map, inventory, evidence, help', C.dim));
    print();

    const mainChoice = await getPlayerChoice(6);

    if (mainChoice === 1) {
      await case3Explore();
      actionsRemaining--;
    } else if (mainChoice === 2) {
      await case3Interrogation();
      actionsRemaining--;
    } else if (mainChoice === 3) {
      await case3Witness();
      actionsRemaining--;
    } else if (mainChoice === 4) {
      await teamDiscussion(3);
    } else if (mainChoice === 5) {
      const solved = await presentRiddle('Old Pierre at the lighthouse says: "I\'ll tell you what I saw, but first — prove your mind is sharp..."');
      if (solved) {
        addClue(3, 'Old Pierre: the man who left walked with military precision — "like a machine"');
        printSuccess('Pierre shares his observation!');
      }
      actionsRemaining--;
      await pressEnter();
    } else if (mainChoice === 6) {
      print();
      print(colorize('  Are you sure you want to make your accusation now?', C.bYellow));
      print(colorize(`  You have ${gameState.clues.case3.length} clues and ${gameState.evidence.case3.length} pieces of evidence.`, C.dim));
      print();
      printChoice(1, 'Yes — I know who did it');
      printChoice(2, 'No — I need more time');
      const confirmAccuse = await getPlayerChoice(2);
      if (confirmAccuse === 1) {
        case3Done = true;
      }
    }
  }

  if (actionsRemaining <= 0 && !case3Done) {
    Terminal.clear();
    printAlert('TIME IS UP!');
    print();
    await printSlow(colorize('  London is sending investigators. The Governor is applying pressure.', C.white), 18);
    await printSlow(colorize('  If you don\'t act now, the case will be taken from you.', C.bRed), 18);
    printDialogue('Camille', "This is our last chance, Inspector. Who killed Commissioner Thorne?");
    print();
    await pressEnter();
  }

  // ─── THE ACCUSATION ───
  const case3Correct = await makeAccusation(3, case3Characters);

  // ─── POST-CASE 3: THE CONFRONTATION DECISION ───
  Terminal.clear();
  print(colorize(`
  ╔══════════════════════════════════════════════════════════╗
  ║                  CASE 3 — CLOSED                        ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Score so far: ${String(gameState.score).padEnd(39)}║
  ║  Clues found: ${String(gameState.clues.case3.length).padEnd(40)}║
  ║  Evidence collected: ${String(gameState.evidence.case3.length).padEnd(34)}║
  ║  Correct accusation: ${(case3Correct ? 'YES ★' : 'NO').padEnd(33)}║
  ╚══════════════════════════════════════════════════════════╝
  `, C.bold, C.bCyan));

  await pressEnter();

  // ─── THE FINAL DECISION ───
  if (gameState.decisions.discoveredConspiracy) {
    Terminal.clear();
    printHeader('THE CONSPIRACY');
    print();

    await printSlow(colorize('  You sit at your desk. The ceiling fan clicks. The evidence is spread before you.', C.white), 20);
    print();
    await printSlow(colorize('  Three murders. One conspiracy. The Governor of Saint-Honoré at the centre.', C.white), 20);
    print();

    printDialogue('Camille', "We have enough to confront the Governor. But he's powerful. If we're wrong...");
    printDialogue('Dwayne', "If we're wrong, we're finished. And not just our careers.");
    printDialogue('JP', "Sir, I've prepared the case file. Everything is documented.");
    print();

    if (gameState.decisions.savedTheWitness) {
      printDialogue('Léon', "I can testify. I have copies of everything. Between my testimony and Thorne's USB drive...");
      printDialogue('Léon', "We can bring him down. But you have to commit, Inspector.");
    }

    print();
    await printSlow(colorize('  The question is: do you have the courage to take on the Governor?', C.bold, C.bWhite), 20);
    print();

    printChoice(1, 'Confront the Governor — bring the evidence, make the arrest');
    printChoice(2, 'Send the evidence to London — let higher authorities handle it');
    print();

    const confrontChoice = await getPlayerChoice(2);
    print();

    if (confrontChoice === 1) {
      gameState.decisions.confrontedGovernor = true;
      await confrontGovernor();
    } else {
      gameState.decisions.confrontedGovernor = false;
      await printSlow(colorize('  You package the evidence and send it via diplomatic courier to Scotland Yard.', C.white), 20);
      await printSlow(colorize('  It\'s the safe choice. The right choice, perhaps. But it doesn\'t feel like enough.', C.white), 20);
      print();
      printDialogue('Camille', "You know he\'ll have time to destroy evidence. To run.");
      printDialogue('You', "I know. But this is bigger than us, Camille.");
      printNarration('She nods. She understands. But there\'s disappointment in her eyes.');
      print();
      await pressEnter();
    }
  } else {
    // Player didn't find the conspiracy
    Terminal.clear();
    print();
    await printSlow(colorize('  The case is closed, but something gnaws at you.', C.white), 20);
    await printSlow(colorize('  Three murders on one small island. Connected? You\'re not sure.', C.white), 20);
    await printSlow(colorize('  But the feeling won\'t go away.', C.white), 20);
    print();
    await pressEnter();
  }
}

async function confrontGovernor() {
  Terminal.clear();
  printHeader("THE GOVERNOR'S MANSION — FINAL CONFRONTATION");

  print(colorize(`
          🏴  ╔════════════════════════════════════╗  🏴
              ║     THE GOVERNOR'S MANSION          ║
              ║         FINAL CONFRONTATION          ║
              ╚════════════════════════════════════╝
              ┌────────────────────────────────────┐
              │  ┌───┐ ╔════════════╗ ┌───┐        │
              │  │ 🪟 │ ║  ⚖️ JUSTICE ║ │ 🪟 │        │
              │  └───┘ ╚════════════╝ └───┘        │
              └────────────────────────────────────┘
              🌳  🌳  🌳  🌳  🌳  🌳  🌳
  `, C.bRed));

  print();
  await printSlow(colorize('  You drive to the Governor\'s Mansion with Camille, Dwayne, and JP.', C.white), 18);
  await printSlow(colorize('  The evening air is heavy with the scent of jasmine and danger.', C.white), 18);
  print();

  printDialogue('Governor', "Inspector Carter! What a pleasant surprise. Do come in.");
  printDialogue('Governor', "Rum? I have a 25-year vintage that—");
  printDialogue('You', "Governor Delacroix, I\'m not here for rum.");
  print();

  await pressEnter();
  Terminal.clear();

  await printSlow(colorize('  You lay the evidence on his mahogany desk. One piece at a time.', C.bold, C.bWhite), 18);
  print();

  printDialogue('You', "Delacroix Holdings. Shell companies in the Cayman Islands.");
  printNarration('The Governor\'s smile flickers.');
  print();
  printDialogue('You', "Three million pounds of hurricane relief money. Diverted.");
  printNarration('His hand trembles slightly as he reaches for his glass.');
  print();
  printDialogue('You', "Selina Artwell was funnelling property money to you. Karl Brandt was your enforcer.");
  printNarration('His face hardens.');
  print();
  printDialogue('You', "And when Commissioner Thorne got too close to the truth...");
  printDialogue('You', "You had Karl kill him.");
  print();

  await pressEnter();

  printDialogue('Governor', "You have no idea what you\'re doing, Inspector.");
  printDialogue('Governor', "I BUILT this island. The schools, the hospital, the harbour.");
  printDialogue('Governor', "Without me, Saint-Honoré is nothing!");
  print();
  printDialogue('You', "Without you, three people would still be alive.");
  print();

  await printSlow(colorize('  The room falls silent. The grandfather clock ticks.', C.italic, C.dim), 20);
  print();

  // Karl enters
  await printSlow(colorize('  A door creaks open behind you. Karl Brandt steps in.', C.bRed), 18);
  await printSlow(colorize('  He\'s armed.', C.bold, C.bRed), 18);
  print();

  printDialogue('Karl', "Governor. Shall I handle this?");
  print();

  printDialogue('Governor', "...");
  print();

  // Tense moment
  printChoice(1, '"Stand down, Karl. It\'s over."');
  printChoice(2, '"Dwayne — NOW!"');

  const tenseMoment = await getPlayerChoice(2);
  print();

  if (tenseMoment === 1) {
    printDialogue('You', "Stand down, Karl. It\'s over. London knows everything. The evidence is already with Scotland Yard.");
    printNarration('Karl looks at the Governor. The Governor looks at the floor.');
    print();
    printDialogue('Governor', "...Stand down, Karl.");
    printDialogue('Karl', "But sir—");
    printDialogue('Governor', "I said stand down! ...It\'s over.");
    print();
    printNarration('Karl slowly lowers his weapon. Camille moves in with handcuffs.');
    gameState.score += 15;
  } else {
    printDialogue('You', "Dwayne — NOW!");
    print();
    printNarration('Dwayne bursts through the side door and tackles Karl from behind.');
    printNarration('The gun skids across the marble floor. JP dives on it.');
    print();
    printDialogue('Dwayne', "I\'ve been waiting to do that for TWENTY YEARS!");
    printDialogue('Karl', "Get OFF me!");
    printDialogue('Camille', "Governor Henry Delacroix, you are under arrest.");
    gameState.score += 15;
  }

  print();
  await pressEnter();
  Terminal.clear();

  // The arrest
  print(colorize(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║           ⚖️  J U S T I C E   S E R V E D  ⚖️          ║
  ║                                                          ║
  ║    Governor Henry Delacroix — ARRESTED                   ║
  ║    Karl Brandt — ARRESTED                                ║
  ║                                                          ║
  ║    Charges: Murder, conspiracy, embezzlement,            ║
  ║    corruption, obstruction of justice                     ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `, C.bold, C.bGreen));

  print();
  await printSlow(colorize('  As the Governor is led out in handcuffs, the people of Saint-Honoré', C.white), 18);
  await printSlow(colorize('  gather in the streets. They watch in silence. Then — slowly —', C.white), 18);
  await printSlow(colorize('  they begin to applaud.', C.white), 18);
  print();

  printDialogue('Camille', "You did it, Inspector. You actually did it.");
  printDialogue('Dwayne', "Dis man... I never thought I\'d see the day.");
  printDialogue('JP', "Sir... that was the bravest thing I\'ve ever seen.");
  print();

  gameState.score += 50;
  await pressEnter();
}

// ─── Case 3 Sub-Functions ───

async function case3Explore() {
  Terminal.clear();
  printSubHeader('WHERE DO YOU WANT TO INVESTIGATE?');
  print();

  const explorable = [
    { id: 'lighthouse', label: 'The Old Lighthouse — re-examine the scene' },
    { id: 'governors_mansion', label: "Governor's Mansion — the seat of power" },
    { id: 'jungle_trail', label: 'Jungle Trail — Karl\'s territory' },
    { id: 'hidden_cove', label: 'The Hidden Cove — where Léon worked' },
    { id: 'docks', label: 'The Docks — check for escape routes' },
    { id: 'plantation', label: 'La Fontaine — where Helen Thorne is staying' },
  ];

  explorable.forEach((loc, i) => {
    const visited = getFlag(`case3_explored_${loc.id}`) ? colorize(' (explored)', C.dim) : '';
    printChoice(i + 1, loc.label + visited);
  });
  printChoice(7, 'Go back');

  const choice = await getPlayerChoice(7);
  if (choice === 7) return;

  const dest = explorable[choice - 1];
  gameState.currentLocation = dest.id;
  setFlag(`case3_explored_${dest.id}`);

  if (dest.id === 'lighthouse') await case3ExploreLighthouse();
  else if (dest.id === 'governors_mansion') await case3ExploreMansion();
  else if (dest.id === 'jungle_trail') await case3ExploreJungle();
  else if (dest.id === 'hidden_cove') await case3ExploreCove();
  else if (dest.id === 'docks') await case3ExploreDocks();
  else if (dest.id === 'plantation') await case3ExplorePlantation();
}

async function case3ExploreLighthouse() {
  Terminal.clear();
  showLocation('lighthouse');
  print(colorize('  The lighthouse is eerie in daylight. The crime scene tape flutters in the wind.', C.white));
  print();

  const items = [
    {
      label: 'Search the rocks below the cliff',
      description: 'Scrambling down the rocks, you find a discarded glove — black leather, large, military-style. It has a faint stain of blood on the index finger. Karl\'s?',
      evidence: 'Black leather military glove with blood stain found near lighthouse',
    },
    {
      label: 'Check for phone signals in the area',
      description: 'JP checks the cell tower data. Two phones pinged the lighthouse tower between 11 PM and 1 AM. One belongs to Thorne. The other is a prepaid number — but it also pinged near the Governor\'s Mansion at 10:30 PM and returned there at 1:15 AM.',
      evidence: 'Cell tower data: unknown phone went Mansion → Lighthouse → Mansion',
      clue: 'Second phone at lighthouse came from and returned to Governor\'s Mansion',
    },
    {
      label: 'Talk to Old Pierre (former lighthouse keeper)',
      description: 'Old Pierre lives in a cottage nearby. "I heard them around midnight. Two men. One sounded scared — English accent. The other was calm. Military. Then a crash. Then silence. The military man left quick. Big fellow. Walked like a machine."',
      clue: 'Old Pierre: heard two men — one English (Thorne), one military (Karl)',
      evidence: 'Witness: military man left lighthouse after crash at midnight',
    },
    {
      label: 'Examine the road leading to the lighthouse',
      description: 'The coastal road has exactly one set of fresh tire tracks heading to and from the lighthouse. JP photographs the tread — it matches a Range Rover Sport, the same vehicle assigned to Karl Brandt as Governor\'s security.',
      evidence: 'Road tire tracks match Karl Brandt\'s Range Rover Sport',
    },
  ];

  await investigateScene(3, 'The Old Lighthouse (Revisited)', '', items);
}

async function case3ExploreMansion() {
  Terminal.clear();
  showLocation('governors_mansion');
  print(colorize('  The Governor\'s Mansion feels different now. Guarded. Tense.', C.white));
  print(colorize('  Karl Brandt stands at the gate, watching you arrive.', C.white));
  print();

  printDialogue('Karl', "Inspector. The Governor is not receiving visitors today.");
  printDialogue('You', "That\'s fine. I\'m here to look around, not to chat.");
  print();

  const items = [
    {
      label: 'Check the mansion garage',
      description: 'The garage contains three vehicles. Karl\'s black Range Rover Sport is freshly washed — unusual for this early. You check the wheel arches: traces of grey coastal clay matching the lighthouse road despite the wash.',
      evidence: 'Karl\'s Range Rover recently washed — but still has lighthouse road clay',
    },
    {
      label: 'Search Karl\'s quarters (ground floor suite)',
      description: 'Karl\'s room is sparse and military-precise. In the wardrobe: military fatigues in dark green — matching the fibres under Thorne\'s nails. A pair of boots, size 12, freshly polished. One pair has a scratch on the left sole.',
      evidence: 'Karl\'s green fatigues match fibres under Thorne\'s nails',
      clue: 'Karl\'s boots are size 12 — matching the lighthouse staircase print',
    },
    {
      label: 'Investigate the Governor\'s study (if you can get in)',
      description: 'Camille distracts the butler while you slip into the study. A wall safe — locked. But on the desk: a calendar with "MIDNIGHT — LH" written on last night\'s date and circled. LH — Lighthouse. The Governor scheduled the meeting.',
      evidence: 'Governor\'s calendar: "MIDNIGHT — LH" on the night Thorne died',
      clue: 'Governor scheduled a midnight lighthouse meeting on the night of murder',
      riddle: true,
      riddleContext: 'The safe has an electronic keypad. There\'s a riddle carved into the brass plate above it...',
      riddleReward: 'Safe contains: original embezzlement records and wire transfer instructions',
    },
    {
      label: 'Talk to the mansion staff',
      description: 'The housekeeper, Marie, speaks quietly. "Karl left at 11 PM last night. Took the Range Rover. Came back after 1 AM. He was... agitated. Went to the kitchen, washed his hands for a very long time. The Governor was still awake — they spoke behind closed doors for an hour."',
      clue: 'Housekeeper: Karl left 11 PM, returned after 1 AM agitated, washed hands obsessively',
      evidence: 'Housekeeper testimony: Karl and Governor spoke in private after Karl returned',
    },
  ];

  await investigateScene(3, "The Governor's Mansion", '', items);
}

async function case3ExploreJungle() {
  Terminal.clear();
  showLocation('jungle_trail');
  print(colorize('  The jungle is more menacing now. Every sound feels like a threat.', C.white));
  print();

  printDialogue('Dwayne', "Karl uses these trails. Be careful, Inspector.");
  print();

  const items = [
    {
      label: 'Follow Karl\'s marked trail',
      description: 'Following the carved initials, you find a hidden cache point. A waterproof box containing: a satellite phone, a passport under a false name (Karl Weber), and €20,000 in cash. Karl has an exit strategy.',
      evidence: 'Karl\'s escape kit: fake passport, sat phone, €20,000 cash',
      clue: 'Karl has a false identity and is prepared to flee',
    },
    {
      label: 'Search the smuggling cave again',
      description: 'The cave from Case 2 has new additions. Fresh crates — and one is partially open, revealing bricks of cash wrapped in plastic. A shipping label reads "Delacroix Foundation — Hurricane Relief." This is the stolen money.',
      evidence: 'Embezzled hurricane relief cash found in jungle smuggling cave',
    },
    {
      label: 'Check the old meeting spot',
      description: 'The hunter\'s blind has been used again recently. This time you find a handwritten note — the Governor\'s handwriting (you\'ve seen his signatures): "Handle Thorne. Tonight. Make it look like an accident. Burn this note." He didn\'t burn it.',
      evidence: 'Governor\'s handwritten order: "Handle Thorne. Tonight. Make it look like an accident."',
      clue: 'Governor ordered Karl to murder Thorne — in writing',
    },
    {
      label: 'Set up a camera at the trail junction',
      description: 'You plant one of JP\'s surveillance cameras at the trail junction. Within an hour, it captures Karl returning to check his cache. He looks nervous, keeps looking over his shoulder. He\'s preparing to run.',
      clue: 'Karl captured on camera checking escape supplies — he\'s planning to flee',
    },
  ];

  await investigateScene(3, 'The Jungle Trail', '', items);
}

async function case3ExploreCove() {
  Terminal.clear();
  showLocation('hidden_cove');
  print(colorize('  The hidden cove is remote and beautiful — and it holds secrets.', C.white));
  print();

  if (gameState.decisions.savedTheWitness) {
    printDialogue('Léon', "This is where I worked. My backup laptop is hidden here. Let me show you.");
    print();
  }

  const items = [
    {
      label: gameState.decisions.savedTheWitness ? 'Retrieve Léon\'s backup laptop' : 'Search the cove for evidence',
      description: gameState.decisions.savedTheWitness
        ? 'Léon pulls a waterproof case from between the rocks. Inside: a laptop with encrypted files, photographs of Karl meeting with smugglers, and audio recordings of the Governor discussing "the Thorne problem." Jackpot.'
        : 'You search the cove thoroughly. Between rocks, you find a waterproof case — inside, a laptop. The files are encrypted, but JP manages to pull some photos: Karl meeting with unidentified men at the docks.',
      evidence: gameState.decisions.savedTheWitness
        ? 'Léon\'s laptop: audio of Governor discussing "the Thorne problem"'
        : 'Encrypted laptop found — photos of Karl\'s meetings',
      clue: gameState.decisions.savedTheWitness
        ? 'Audio recording proves Governor ordered Thorne\'s death'
        : 'Photos link Karl to smuggling network but audio is encrypted',
    },
    {
      label: 'Search the cave system',
      description: 'The caves go deeper than you expected. In a dry chamber: a cot, water bottles, and a stack of newspapers. Someone was hiding here recently. The newspapers are marked with highlighter — articles about police corruption investigations across the Caribbean.',
      clue: 'Someone was hiding in the caves recently — monitoring corruption stories',
    },
    {
      label: 'Check the cove beach for boats',
      description: 'A small motorboat is pulled up on the sand. No registration. In the storage compartment: navigation charts with a route to Venezuela marked. Another escape route — this time by sea.',
      evidence: 'Unregistered boat with route to Venezuela — escape plan',
    },
    {
      label: 'Interview Cédric the fisherman',
      description: 'Cédric was fishing near the cove the night Thorne died. "I saw a young man here — typing on a laptop. He was here all night. I know because I checked my nets three times. He never moved."',
      clue: 'Cédric confirms: man (Léon) at cove all night — corroborates his alibi',
    },
  ];

  await investigateScene(3, 'The Hidden Cove', '', items);
}

async function case3ExploreDocks() {
  Terminal.clear();
  showLocation('docks');
  print(colorize('  The docks are busy during the day, but you notice something —', C.white));
  print(colorize('  Karl\'s black speedboat is tied at the far end.', C.white));
  print();

  const items = [
    {
      label: 'Search Karl\'s speedboat',
      description: 'The speedboat is locked but JP picks it open. Under the seat: a locked briefcase. Inside the briefcase: £50,000 in cash, a loaded pistol, and a photograph of Commissioner Thorne with a red X drawn over his face. Premeditation proved.',
      evidence: 'Karl\'s boat: £50K cash, weapon, photo of Thorne with X through face',
      clue: 'Photo proves Karl had targeted Thorne specifically — premeditated murder',
    },
    {
      label: 'Interview Emmanuel the dock worker',
      description: '"I saw Karl\'s SUV last night around 11:30. Heading toward the lighthouse road. Fast. No lights on — driving in the dark. He didn\'t want to be seen."',
      evidence: 'Emmanuel: Karl\'s Range Rover heading to lighthouse at 11:30 PM, lights off',
    },
    {
      label: 'Check the ferry passenger records',
      description: 'The ferry records show an interesting name: Helen Thorne booked a one-way ticket to Guadeloupe for tomorrow. Running? Or just grief? Also: Karl booked under his fake name "Weber" for the day after.',
      clue: 'Karl booked ferry escape under fake name "Weber" — planning to flee',
    },
    {
      label: 'Search the dock master\'s log for suspicious activity',
      description: 'The log shows Karl\'s speedboat arriving from Guadeloupe eight times in three months. Each arrival coincides with large cash deposits into a Honoré bank. Money laundering through the docks.',
      evidence: 'Dock logs: Karl\'s boat trips correlate with cash deposits — money laundering',
      riddle: true,
      riddleContext: 'The dock master has coded his logbook. "Crack my code and I\'ll show you the private entries..."',
      riddleReward: 'Dock master\'s private log: Governor met Karl\'s boat personally on two occasions',
    },
  ];

  await investigateScene(3, 'The Docks', '', items);
}

async function case3ExplorePlantation() {
  Terminal.clear();
  showLocation('plantation');
  print(colorize('  Helen Thorne is staying at the hotel. She\'s sitting on the veranda,', C.white));
  print(colorize('  staring at nothing, a cup of tea growing cold.', C.white));
  print();

  const items = [
    {
      label: 'Talk to Helen Thorne gently',
      description: 'Helen speaks softly. "James was a good man. Flawed, yes. The secret daughter... that hurt. But he was trying to do right — this investigation was his redemption." She starts to cry. "He said he was meeting someone who could confirm everything. \'One more night,\' he said. \'Then we can go home.\'"',
      clue: 'Helen: Thorne was meeting a confirmation source — "one more night"',
    },
    {
      label: 'Check Helen\'s sleeping pills prescription',
      description: 'Annette the receptionist confirms: Helen collected her pills at 8:45 PM. She went to her room. Her light went off at 9:15. She was seen by three different staff members between 8:45 and 9:15 — solid alibi.',
      evidence: 'Three hotel staff confirm Helen was in her room by 9:15 PM — solid alibi',
    },
    {
      label: 'Search Thorne\'s hotel room (with Helen\'s permission)',
      description: 'In Thorne\'s room: a second phone — a burner, encrypted. JP manages to access the last call: an incoming call at 10:30 PM from a number traced to the Governor\'s Mansion landline. The Governor called Thorne and set up the meeting.',
      evidence: 'Thorne\'s burner phone: last call at 10:30 PM from Governor\'s Mansion',
      clue: 'Governor personally lured Thorne to the lighthouse meeting',
    },
    {
      label: 'Ask Madeleine about the night of the murder',
      description: 'Madeleine is shaken. "I saw Karl Brandt driving past the hotel at 11:20 PM. No headlights. Toward the lighthouse. I thought it was strange, but Karl does strange things. Now I understand." She hands you a photo — Karl\'s SUV captured on the hotel\'s parking camera.',
      evidence: 'Hotel camera: Karl\'s SUV passing at 11:20 PM toward lighthouse',
    },
  ];

  await investigateScene(3, 'La Fontaine Plantation', '', items);
}

async function case3Interrogation() {
  Terminal.clear();
  printHeader('INTERROGATION ROOM');

  print(colorize(`
      ┌─────────────────────────────────┐
      │          💡                      │
      │     ┌─────────────┐             │
      │     │ INTERROGATION│             │
      │     │    ROOM      │             │
      │     └──────┬──────┘             │
      │     ┌──────┴──────┐             │
      │     │   🪑     🪑  │             │
      │     │      📋      │             │
      │     │   🪑     🪑  │             │
      │     └─────────────┘             │
      └─────────────────────────────────┘
  `, C.bCyan));

  print(colorize('  Who do you want to interrogate?', C.bold, C.white));
  print();

  const suspects = case3Characters.suspects;
  const keys = Object.keys(suspects);

  keys.forEach((key, i) => {
    const s = suspects[key];
    const already = wasInterrogated(3, s.name) ? colorize(' (already questioned)', C.dim) : '';
    printChoice(i + 1, `${s.name} — ${s.occupation}${already}`);
  });
  printChoice(keys.length + 1, 'Go back');

  const choice = await getPlayerChoice(keys.length + 1);
  if (choice === keys.length + 1) return;

  const key = keys[choice - 1];
  await interrogate(3, key, case3Characters);
}

async function case3Witness() {
  Terminal.clear();
  printSubHeader('WITNESS INTERVIEWS');
  print();
  print(colorize('  Who do you want to interview?', C.bold, C.white));
  print();

  const witnesses = case3Characters.witnesses;
  const keys = Object.keys(witnesses);

  keys.forEach((key, i) => {
    const w = witnesses[key];
    const already = getFlag(`case3_witness_${key}`) ? colorize(' (interviewed)', C.dim) : '';
    printChoice(i + 1, `${w.name} — ${w.occupation}${already}`);
  });
  printChoice(keys.length + 1, 'Go back');

  const choice = await getPlayerChoice(keys.length + 1);
  if (choice === keys.length + 1) return;

  const key = keys[choice - 1];
  const witness = witnesses[key];
  setFlag(`case3_witness_${key}`);

  print();
  printHeader(`WITNESS: ${witness.name.toUpperCase()}`);
  print(colorize(`  ${witness.occupation}`, C.dim));
  print();

  printDialogue(witness.name.split(' ')[0], witness.testimony);
  print();

  addClue(3, witness.revealsClue);

  if (key === 'lighthouse_keeper') {
    print();
    printDialogue('You', "The military man — can you describe him more?");
    printDialogue('Old Pierre', "Big. Very big. Short hair. Walked like every step was deliberate. And he smelled of expensive cigarettes — French ones.");
    addClue(3, 'Pierre: military man smoked Gauloises, matches Karl\'s profile exactly');
  }

  if (key === 'dock_worker') {
    print();
    printDialogue('You', "You\'re sure it was Karl\'s vehicle?");
    printDialogue('Emmanuel', "That black Range Rover nearly killed me last month. I know it. And the driver — big shadow, military haircut. It was him.");
    addClue(3, 'Emmanuel is certain: Karl\'s Range Rover headed toward lighthouse');
  }

  await pressEnter();
}

// ============================================================================
//  THE ENDINGS
// ============================================================================

async function showEnding() {
  Terminal.clear();

  // Calculate which ending the player gets
  const {
    trustedMadeleine,
    savedTheWitness,
    confrontedGovernor,
    accusedCorrectly,
    riddlesSolved,
    totalRiddles,
    discoveredConspiracy,
  } = gameState.decisions;

  const correctCases = accusedCorrectly.filter(x => x).length;
  const totalScore = gameState.score;

  // ─── DETERMINE ENDING ───
  // Ending 4 (Best): All 3 correct + trusted Madeleine + saved witness + confronted Governor
  // Ending 3 (Good): 2+ correct + discovered conspiracy
  // Ending 2 (Bittersweet): 1+ correct but missed conspiracy or key decisions
  // Ending 1 (Dark): 0 correct or failed to discover conspiracy and didn't confront

  let ending;
  if (correctCases === 3 && trustedMadeleine && savedTheWitness && confrontedGovernor) {
    ending = 4;
  } else if (correctCases >= 2 && discoveredConspiracy) {
    ending = 3;
  } else if (correctCases >= 1) {
    ending = 2;
  } else {
    ending = 1;
  }

  // Score bonuses
  if (ending === 4) gameState.score += 200;
  else if (ending === 3) gameState.score += 100;
  else if (ending === 2) gameState.score += 50;

  // ═══════════════════════════════════════════════════════════
  //  EPILOGUE
  // ═══════════════════════════════════════════════════════════

  print(colorize(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║           E P I L O G U E                                ║
  ║                                                          ║
  ║       Three months later on Saint-Honoré...              ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `, C.bold, C.bCyan));

  await pressEnter();
  Terminal.clear();

  const SUNSET_ART = `${colorize(`
      
                    🌅
              .-~~~-.
          .-~~       ~~-.
       .-~               ~-.
      (                     )
       ~-._             _.-~
           ~~--_____--~~
      ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
    ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
  ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
  `, C.bYellow)}`;

  print(SUNSET_ART);

  // ─── ENDING 4: THE GOLDEN ENDING ───
  if (ending === 4) {
    printHeader('ENDING: THE DETECTIVE WHO SAVED AN ISLAND');
    print();

    await printSlow(colorize('  The Caribbean sun sets over Saint-Honoré.', C.bYellow), 20);
    await printSlow(colorize('  For the first time in twenty years, the island breathes freely.', C.white), 20);
    print();

    await printSlow(colorize('  Governor Delacroix and Karl Brandt were sentenced to life in prison.', C.white), 20);
    await printSlow(colorize('  The stolen hurricane relief funds were recovered and returned.', C.white), 20);
    await printSlow(colorize('  New schools were built. The hospital got its equipment.', C.white), 20);
    await printSlow(colorize('  The coral reef was protected by law.', C.white), 20);
    print();

    await printSlow(colorize('  Selina Artwell turned Crown\'s evidence and testified.', C.white), 20);
    await printSlow(colorize('  Nadia Beaumont received a life sentence.', C.white), 20);
    await printSlow(colorize('  Léon Samuels published his story. It won a Pulitzer.', C.bGreen), 20);
    print();

    await printSlow(colorize('  Madeleine saved La Fontaine Plantation with the recovered funds.', C.white), 20);
    await printSlow(colorize('  Tommy\'s reef is thriving. He named a fish after you.', C.white), 20);
    print();

    printDialogue('Camille', "So, Inspector... are you staying?");
    print();

    await printSlow(colorize('  You look at the sunset. The rum punch in your hand.', C.white), 20);
    await printSlow(colorize('  The sound of steel drums drifting from the Rum Shack.', C.white), 20);
    await printSlow(colorize('  The lizard on the office wall that you\'ve named Gerald.', C.white), 20);
    print();

    printDialogue('You', "...I\'m staying.");
    print();

    printDialogue('Camille', "Good. Because there\'s a report of a stolen goat in Catherine\'s Market.");
    printDialogue('Dwayne', "Not Catherine\'s goat again...");
    printDialogue('JP', "I\'ll get the Land Rover, sir!");
    print();

    await printSlow(colorize('  You smile. Paradise has its problems.', C.white), 20);
    await printSlow(colorize('  But at least now, there\'s someone here to solve them.', C.bold, C.bCyan), 20);
    print();

    print(colorize('\n  ★ ★ ★ ★ ★  PERFECT ENDING  ★ ★ ★ ★ ★', C.bold, C.bYellow));

  // ─── ENDING 3: THE GOOD ENDING ───
  } else if (ending === 3) {
    printHeader('ENDING: JUSTICE, AT A COST');
    print();

    await printSlow(colorize('  The Governor was arrested and extradited to London for trial.', C.white), 20);
    await printSlow(colorize('  The corruption network was exposed. Money was recovered — most of it.', C.white), 20);
    print();

    if (!savedTheWitness) {
      await printSlow(colorize('  Léon Samuels was never found. His disappearance haunts you.', C.bRed), 20);
      await printSlow(colorize('  You wonder what would have happened if you\'d protected him.', C.white), 20);
      print();
    }

    if (!trustedMadeleine) {
      await printSlow(colorize('  Madeleine Duval lost La Fontaine Plantation. It became a hotel chain.', C.dim), 20);
      await printSlow(colorize('  The folder she offered might have saved it. You\'ll never know.', C.white), 20);
      print();
    }

    await printSlow(colorize('  Saint-Honoré is healing. Slowly. The scars of corruption run deep.', C.white), 20);
    await printSlow(colorize('  A new Governor was elected — honest, the people hope.', C.white), 20);
    print();

    printDialogue('Camille', "We did good work, Inspector. Not perfect. But good.");
    printDialogue('You', "Good will have to do.");
    print();

    await printSlow(colorize('  You stay on the island. There\'s more work to be done.', C.white), 20);
    await printSlow(colorize('  And this strange, beautiful, infuriating island... it feels like home.', C.white), 20);
    print();

    print(colorize('\n  ★ ★ ★ ★  GOOD ENDING  ★ ★ ★ ★', C.bold, C.bGreen));

  // ─── ENDING 2: THE BITTERSWEET ENDING ───
  } else if (ending === 2) {
    printHeader('ENDING: THE ONES THAT GOT AWAY');
    print();

    await printSlow(colorize('  Some justice was served. Not enough.', C.white), 20);
    print();

    if (correctCases < 3) {
      await printSlow(colorize(`  ${3 - correctCases} killer${3 - correctCases > 1 ? 's' : ''} walked free. Wrong suspects were convicted.`, C.bRed), 20);
      await printSlow(colorize('  Innocent people sit in cells while the guilty roam free.', C.white), 20);
      print();
    }

    if (!discoveredConspiracy) {
      await printSlow(colorize('  The deeper conspiracy was never uncovered.', C.bRed), 20);
      await printSlow(colorize('  Governor Delacroix remains in power. The corruption continues.', C.white), 20);
      await printSlow(colorize('  Hurricane relief money keeps disappearing. The people suffer.', C.white), 20);
      print();
    }

    printDialogue('Camille', "Inspector... do you feel like we missed something?");
    printDialogue('You', "Every day, Camille. Every single day.");
    print();

    await printSlow(colorize('  London offers you a transfer back. You consider it.', C.white), 20);
    await printSlow(colorize('  The rain. The grey skies. The cold.', C.white), 20);
    await printSlow(colorize('  You decline. Not because you\'re at peace.', C.white), 20);
    await printSlow(colorize('  But because running from unfinished business isn\'t your style.', C.white), 20);
    print();

    print(colorize('\n  ★ ★ ★  BITTERSWEET ENDING  ★ ★ ★', C.bold, C.bYellow));

  // ─── ENDING 1: THE DARK ENDING ───
  } else {
    printHeader('ENDING: PARADISE LOST');
    print();

    await printSlow(colorize('  You solved nothing. Or worse — you solved it wrong.', C.bRed), 20);
    print();

    await printSlow(colorize('  Innocent people were convicted. The real killers walk free.', C.white), 20);
    await printSlow(colorize('  Governor Delacroix tightens his grip on the island.', C.white), 20);
    await printSlow(colorize('  Karl Brandt watches you from a distance, smirking.', C.white), 20);
    print();

    if (!savedTheWitness) {
      await printSlow(colorize('  Léon Samuels vanished. No one looks for him anymore.', C.bRed), 20);
    }

    await printSlow(colorize('  Commissioner Thorne\'s murder is filed as "unsolved." Again.', C.white), 20);
    print();

    printDialogue('Camille', "London is requesting your transfer back, Inspector.");
    printDialogue('Camille', "I think... I think you should take it.");
    print();

    await printSlow(colorize('  You pack your bags in silence.', C.white), 20);
    await printSlow(colorize('  The ceiling fan clicks. The lizard watches from the wall.', C.white), 20);
    await printSlow(colorize('  You leave Saint-Honoré the way you arrived — alone.', C.white), 20);
    print();

    await printSlow(colorize('  On the plane, you look down at the island. A green jewel', C.white), 20);
    await printSlow(colorize('  in a turquoise sea. Beautiful from above.', C.white), 20);
    await printSlow(colorize('  You know the truth: beneath the beauty, darkness festers.', C.bRed), 20);
    await printSlow(colorize('  And you couldn\'t stop it.', C.white), 20);
    print();

    print(colorize('\n  ★  DARK ENDING  ★', C.bold, C.bRed));
  }

  print();
  await pressEnter();

  // ═══════════════════════════════════════════════════════════
  //  FINAL SCORE SCREEN
  // ═══════════════════════════════════════════════════════════

  Terminal.clear();

  const TROPHY_ART = ending === 4 ? `${colorize(`
              ___________
             '._==_==_=_.'
             .-\\:      /-.
            | (|:.     |) |
             '-|:.     |-'
               \\::.    /
                '::. .'
                  ) (
                _.' '._
               '-------'
            MASTER DETECTIVE
  `, C.bYellow)}` : ending === 3 ? `${colorize(`
              ___________
             '._==_==_=_.'
             .-\\:      /-.
            | (|:.     |) |
             '-|:.     |-'
               \\::.    /
                '::. .'
                  ) (
                _.' '._
               '-------'
           SKILLED DETECTIVE
  `, C.bGreen)}` : ending === 2 ? `${colorize(`
                ┌──────┐
                │ ⭐   │
                │ DET. │
                │      │
                └──┬───┘
                   │
               ────┴────
             JUNIOR DETECTIVE
  `, C.bYellow)}` : `${colorize(`
                ┌──────┐
                │  ??  │
                │ DET. │
                │      │
                └──┬───┘
                   │
               ────┴────
              TRANSFERRED
  `, C.dim)}`;

  print(TROPHY_ART);

  const riddleScore = `${riddlesSolved}/${totalRiddles}`;

  print(colorize(`
  ╔══════════════════════════════════════════════════════════╗
  ║             F I N A L   R E P O R T                     ║
  ╠══════════════════════════════════════════════════════════╣
  ║                                                          ║
  ║  Detective: Inspector Alex Carter                        ║
  ║  Island:    Saint-Honoré, Caribbean                      ║
  ║                                                          ║
  ╠══════════════════════════════════════════════════════════╣
  ║  CASE RESULTS:                                           ║
  ║  ─────────────────────────────────────────                ║
  ║  Case 1 — Beach House Murder:    ${(accusedCorrectly[0] ? '✅ SOLVED' : '❌ WRONG ').padEnd(22)}║
  ║  Case 2 — Poisoned Rum Punch:    ${(accusedCorrectly[1] ? '✅ SOLVED' : '❌ WRONG ').padEnd(22)}║
  ║  Case 3 — Vanishing Witness:     ${(accusedCorrectly[2] ? '✅ SOLVED' : '❌ WRONG ').padEnd(22)}║
  ║                                                          ║
  ╠══════════════════════════════════════════════════════════╣
  ║  KEY DECISIONS:                                          ║
  ║  ─────────────────────────────────────────                ║
  ║  Trusted Madeleine:       ${(trustedMadeleine ? 'YES ✓' : 'NO  ✗').padEnd(28)}║
  ║  Saved the Witness:       ${(savedTheWitness ? 'YES ✓' : 'NO  ✗').padEnd(28)}║
  ║  Discovered Conspiracy:   ${(discoveredConspiracy ? 'YES ✓' : 'NO  ✗').padEnd(28)}║
  ║  Confronted Governor:     ${(confrontedGovernor ? 'YES ✓' : 'NO  ✗').padEnd(28)}║
  ║  Riddles Solved:          ${riddleScore.padEnd(28)}║
  ║                                                          ║
  ╠══════════════════════════════════════════════════════════╣
  ║                                                          ║
  ║  ENDING: ${(ending === 4 ? '★ PERFECT — The Detective Who Saved an Island' : ending === 3 ? '★ GOOD — Justice, At a Cost' : ending === 2 ? '★ BITTERSWEET — The Ones That Got Away' : '★ DARK — Paradise Lost').padEnd(47)}║
  ║                                                          ║
  ║  FINAL SCORE: ${String(gameState.score).padEnd(41)}║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `, ending === 4 ? C.bYellow : ending === 3 ? C.bGreen : ending === 2 ? C.bCyan : C.bRed));

  print();

  // Rating
  if (gameState.score >= 500) {
    print(colorize('  🏆 RANK: LEGENDARY DETECTIVE — Scotland Yard\'s finest!', C.bold, C.bYellow));
  } else if (gameState.score >= 350) {
    print(colorize('  🥇 RANK: SENIOR DETECTIVE — Exceptional work, Inspector.', C.bold, C.bGreen));
  } else if (gameState.score >= 200) {
    print(colorize('  🥈 RANK: DETECTIVE — Solid police work.', C.bold, C.bCyan));
  } else if (gameState.score >= 100) {
    print(colorize('  🥉 RANK: JUNIOR DETECTIVE — Room for improvement.', C.bold, C.bYellow));
  } else {
    print(colorize('  📎 RANK: DESK DUTY — Maybe detective work isn\'t for you...', C.dim));
  }

  print();

  // Replay hint
  print(colorize('  ─────────────────────────────────────────────────', C.dim));
  print(colorize('  There are 4 different endings. Your choices matter.', C.dim));
  print(colorize('  Trust wisely. Investigate thoroughly. Solve every riddle.', C.dim));
  print(colorize('  The island has more secrets to reveal...', C.dim));
  print(colorize('  ─────────────────────────────────────────────────', C.dim));
  print();

  printDialogue('', "Thank you for playing ISLAND MYSTERY: Death on Saint-Honoré");
  print();
}

// ============================================================================
//  MAIN GAME LOOP
// ============================================================================

async function main() {
  try {
    await titleScreen();
    await prologue();
    await case1();
    await case2();
    await case3();
    await showEnding();
    
    print();
    printDoubleLine();
    print(colorize('  Thank you for playing Island Mystery!', C.bold, C.bCyan));
    print(colorize(`  Final Score: ${gameState.score}`, C.bold, C.bYellow));
    printDoubleLine();
    print();
    
    // game ended
  } catch (err) {
    if (err.message !== 'QUIT') {
      print(colorize(`  An error occurred: ${err.message}`, C.bRed));
    }
    // game ended
  }
}

// Start the game when the page is ready
window.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure terminal is ready
  setTimeout(() => main(), 100);
});
