#!/usr/bin/env node
/**
 * Migration script: Convert old texture types to Gareth James 12-type system
 *
 * Old types: dry_ace_high, dry_king_high, wet_broadway, paired_high, monotone, etc.
 * New types: ABB, ABx, Axx, BBB, BBx, KQx, JTx, JT_conn, Low_conn, Low_unconn, Paired, Trips
 */

const fs = require('fs');
const path = require('path');

// Rank values for classification
const RANK_VALUES = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
};

const CONNECTED_GAP_THRESHOLD = 4;

// Texture display names (Chinese)
const TEXTURE_NAMES_ZH = {
  'ABB': 'A + 兩張大牌',
  'ABx': 'A + 一張大牌 + 低牌',
  'Axx': 'A + 兩張低牌',
  'BBB': '三張大牌 (無 A)',
  'BBx': '兩張大牌 + 低牌',
  'KQx': 'K/Q 高 + 兩低牌',
  'JTx': 'J/T 高 + 不連接',
  'JT_conn': 'J/T 高 + 連接',
  'Low_conn': '低牌連接',
  'Low_unconn': '低牌不連接',
  'Paired': '配對牌面',
  'Trips': '三條牌面'
};

/**
 * Parse a card string like "Ah" or "Ks" into rank
 */
function parseCard(cardStr) {
  if (!cardStr || cardStr.length < 2) return null;
  const rank = cardStr[0].toUpperCase();
  return rank;
}

/**
 * Compute gap sum for connectivity check
 */
function computeGapSum(ranks) {
  const values = ranks.map(r => RANK_VALUES[r] || 0).sort((a, b) => b - a);
  let sum = 0;
  for (let i = 0; i < values.length - 1; i++) {
    sum += values[i] - values[i + 1];
  }
  return sum;
}

/**
 * Check if board has pairs or trips
 */
function checkPaired(ranks) {
  const counts = {};
  for (const rank of ranks) {
    counts[rank] = (counts[rank] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts));
  return {
    isPaired: maxCount >= 2,
    isTrips: maxCount === 3
  };
}

/**
 * Classify a flop into Gareth James 12-type system
 */
function classifyFlop(ranks) {
  const { isPaired, isTrips } = checkPaired(ranks);

  // Step 1: Trips
  if (isTrips) return 'Trips';

  // Step 2: Paired
  if (isPaired) return 'Paired';

  // Step 3: Count rank categories
  const values = ranks.map(r => RANK_VALUES[r] || 0);
  const aceCount = values.filter(v => v === 14).length;
  const broadwayCount = values.filter(v => v >= 10 && v <= 13).length; // T, J, Q, K
  const gapSum = computeGapSum(ranks);

  // Step 3a: Ace present
  if (aceCount === 1) {
    if (broadwayCount === 2) return 'ABB';
    if (broadwayCount === 1) return 'ABx';
    return 'Axx';
  }

  // Step 3b: No Ace, all Broadway
  if (broadwayCount === 3) return 'BBB';

  // Step 3c: 2 Broadway + 1 low
  if (broadwayCount === 2) return 'BBx';

  // Step 3d: 1 Broadway + 2 low
  if (broadwayCount === 1) {
    const bwayValue = values.find(v => v >= 10 && v <= 13);
    if (bwayValue >= 12) return 'KQx'; // K(13) or Q(12)
    // J(11) or T(10) — check connectivity
    if (gapSum <= CONNECTED_GAP_THRESHOLD) return 'JT_conn';
    return 'JTx';
  }

  // Step 3e: All low cards (all ≤ 9)
  if (gapSum <= CONNECTED_GAP_THRESHOLD) return 'Low_conn';
  return 'Low_unconn';
}

/**
 * Process a single solver JSON file
 */
function processSolverFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  let updated = 0;

  if (data.scenarios && Array.isArray(data.scenarios)) {
    for (const scenario of data.scenarios) {
      if (scenario.board && Array.isArray(scenario.board)) {
        const ranks = scenario.board.map(parseCard).filter(Boolean);
        if (ranks.length === 3) {
          const newTexture = classifyFlop(ranks);
          const oldTexture = scenario.texture;

          if (oldTexture !== newTexture) {
            scenario.texture = newTexture;
            scenario.texture_zh = TEXTURE_NAMES_ZH[newTexture] || newTexture;
            updated++;
          }
        }
      }
    }
  }

  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  ✓ ${path.basename(filePath)}: ${updated} scenarios updated`);
  } else {
    console.log(`  - ${path.basename(filePath)}: no changes needed`);
  }

  return updated;
}

/**
 * Process classify.json - rebuild with new texture types
 */
function processClassifyJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  let updated = 0;

  if (data.scenarios && Array.isArray(data.scenarios)) {
    for (const scenario of data.scenarios) {
      if (scenario.flop && Array.isArray(scenario.flop)) {
        const ranks = scenario.flop;
        if (ranks.length === 3) {
          const newTexture = classifyFlop(ranks);
          const oldTexture = scenario.correct_texture;

          if (oldTexture !== newTexture) {
            scenario.correct_texture = newTexture;
            // Update explanations
            scenario.explanation_zh = `${ranks.join('')} - ${TEXTURE_NAMES_ZH[newTexture]}`;
            scenario.explanation_en = `${ranks.join('')} - ${newTexture} texture`;
            updated++;
          }
        }
      }
    }
  }

  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  ✓ ${path.basename(filePath)}: ${updated} scenarios updated`);
  }

  return updated;
}

/**
 * Process level1_textures.json - update texture_id while keeping strategies
 */
function processLevel1Textures(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  - level1_textures.json: not found`);
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  let updated = 0;

  // Old to new texture mapping based on representative board
  const oldToNewMapping = {
    'dry_ace_high': 'Axx',      // A72
    'dry_king_high': 'KQx',     // K72
    'dry_queen_high': 'KQx',    // Q73
    'dry_low': 'Low_unconn',    // 852
    'paired_high': 'Paired',    // KK7
    'paired_low': 'Paired',     // 552
    'monotone': 'JTx',          // J73 (will be noted as monotone in category)
    'two_tone_high': 'ABB',     // AK7
    'two_tone_low': 'Low_unconn', // 862
    'connected_high': 'BBB',    // QJT
    'connected_middle': 'Low_conn', // 987
    'connected_low': 'Low_conn' // 654
  };

  // Broader category mapping
  const categoryMapping = {
    'Axx': 'dry',
    'ABx': 'dry',
    'ABB': 'broadway',
    'BBB': 'broadway',
    'BBx': 'broadway',
    'KQx': 'dry',
    'JTx': 'dry',
    'JT_conn': 'connected',
    'Low_conn': 'connected',
    'Low_unconn': 'dry',
    'Paired': 'paired',
    'Trips': 'paired'
  };

  if (data.textures && Array.isArray(data.textures)) {
    for (const texture of data.textures) {
      const oldId = texture.texture_id;
      if (oldToNewMapping[oldId]) {
        // Also check the actual board to get precise classification
        if (texture.representative_board && texture.representative_board.length === 3) {
          const ranks = texture.representative_board.map(parseCard);
          const newType = classifyFlop(ranks);

          texture.texture_id = newType;
          texture.texture_zh = TEXTURE_NAMES_ZH[newType] || newType;
          // Keep category for UI grouping, but update if needed
          if (categoryMapping[newType]) {
            texture.category = categoryMapping[newType];
          }
          updated++;
        }
      }
    }
  }

  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  ✓ level1_textures.json: ${updated} textures updated`);
  }

  return updated;
}

/**
 * Main migration function
 */
function main() {
  console.log('=== Texture Type Migration ===\n');

  const apiDataDir = path.join(__dirname, '../apps/api/data');

  // 1. Process solver JSON files
  console.log('1. Processing solver JSON files...');
  const solverDir = path.join(apiDataDir, 'solver');
  const solverFiles = fs.readdirSync(solverDir).filter(f => f.endsWith('.json'));
  let totalSolverUpdates = 0;

  for (const file of solverFiles) {
    if (file === 'level1_textures.json') continue; // Handle separately
    totalSolverUpdates += processSolverFile(path.join(solverDir, file));
  }
  console.log(`   Total solver updates: ${totalSolverUpdates}\n`);

  // 1.5. Process level1_textures.json
  console.log('1.5. Processing level1_textures.json...');
  processLevel1Textures(path.join(solverDir, 'level1_textures.json'));

  // 2. Process flop-texture JSON files
  console.log('2. Processing flop-texture JSON files...');
  const flopTextureDir = path.join(apiDataDir, 'flop-texture');

  const classifyPath = path.join(flopTextureDir, 'classify.json');
  if (fs.existsSync(classifyPath)) {
    processClassifyJson(classifyPath);
  }

  // cbet.json and quick.json may have different structures
  const cbetPath = path.join(flopTextureDir, 'cbet.json');
  if (fs.existsSync(cbetPath)) {
    const content = fs.readFileSync(cbetPath, 'utf8');
    const data = JSON.parse(content);
    let updated = 0;

    if (data.scenarios) {
      for (const scenario of data.scenarios) {
        if (scenario.flop && Array.isArray(scenario.flop)) {
          const ranks = scenario.flop;
          if (ranks.length === 3) {
            const newTexture = classifyFlop(ranks);
            if (scenario.texture !== newTexture) {
              scenario.texture = newTexture;
              scenario.texture_zh = TEXTURE_NAMES_ZH[newTexture];
              updated++;
            }
          }
        }
      }
    }

    if (updated > 0) {
      fs.writeFileSync(cbetPath, JSON.stringify(data, null, 2) + '\n');
      console.log(`  ✓ cbet.json: ${updated} scenarios updated`);
    }
  }

  const quickPath = path.join(flopTextureDir, 'quick.json');
  if (fs.existsSync(quickPath)) {
    const content = fs.readFileSync(quickPath, 'utf8');
    const data = JSON.parse(content);
    let updated = 0;

    if (data.scenarios) {
      for (const scenario of data.scenarios) {
        if (scenario.flop && Array.isArray(scenario.flop)) {
          const ranks = scenario.flop;
          if (ranks.length === 3) {
            const newTexture = classifyFlop(ranks);
            if (scenario.texture !== newTexture) {
              scenario.texture = newTexture;
              scenario.texture_zh = TEXTURE_NAMES_ZH[newTexture];
              updated++;
            }
          }
        }
      }
    }

    if (updated > 0) {
      fs.writeFileSync(quickPath, JSON.stringify(data, null, 2) + '\n');
      console.log(`  ✓ quick.json: ${updated} scenarios updated`);
    }
  }

  console.log('\n=== Migration Complete ===');
}

main();
