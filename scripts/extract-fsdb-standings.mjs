#!/usr/bin/env node

/**
 * Extract competition standings from FSDB file for test fixtures.
 *
 * Usage: node scripts/extract-fsdb-standings.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fsdbPath = resolve(
  __dirname,
  "../docs/test-data/lliga-catalana/PROVA.fsdb"
);
const outputPath = resolve(
  __dirname,
  "../tests/fixtures/lliga-catalana/expected-results/standings-3tasks.json"
);

const xml = readFileSync(fsdbPath, "utf-8");

// Find the 3-task result block (tasks="10;11;12")
const resultMatch = xml.match(
  /<FsCompetitionResult[^>]*tasks="10;11;12"[^>]*>([\s\S]*?)<\/FsCompetitionResult>/
);
if (!resultMatch) {
  console.error("Could not find 3-task FsCompetitionResult block");
  process.exit(1);
}

const block = resultMatch[1];

// Extract each participant
const participantRegex =
  /<FsParticipant id="(\d+)" points="(\d+)" rank="(\d+)">\s*([\s\S]*?)\s*<\/FsParticipant>/g;
const taskRegex =
  /<FsTask id="(\d+)" points="([\d.]+)" counting_points="([\d.]+)" counts="(\d+)" \/>/g;

const standings = [];
let match;
while ((match = participantRegex.exec(block)) !== null) {
  const pilotId = parseInt(match[1], 10);
  const totalPoints = parseInt(match[2], 10);
  const rank = parseInt(match[3], 10);
  const tasksBlock = match[4];

  const taskPoints = {};
  let taskMatch;
  taskRegex.lastIndex = 0;
  while ((taskMatch = taskRegex.exec(tasksBlock)) !== null) {
    taskPoints[taskMatch[1]] = {
      points: parseFloat(taskMatch[2]),
      countingPoints: parseFloat(taskMatch[3]),
    };
  }

  standings.push({ pilotId, rank, totalPoints, taskPoints });
}

const fixture = {
  ftvFactor: 0.33,
  useBestScoreForFtvValidity: true,
  standings,
};

writeFileSync(outputPath, JSON.stringify(fixture, null, 2) + "\n");
console.log(`Extracted ${standings.length} pilot standings to ${outputPath}`);
