#!/usr/bin/env node
/**
 * Merge pilot metadata from FS HTML overall results into participants.json.
 *
 * Extracts gender, nationality, glider, and glider class from the HTML and
 * merges them into the existing participants file, matching by pilot ID.
 *
 * Usage: node scripts/merge-html-participants.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const HTML_PATH = path.join(
  ROOT,
  "docs/test-data/lliga-catalana/PROVA_Overall_V338_compe.html"
);
const PARTICIPANTS_PATH = path.join(
  ROOT,
  "data/05bcbacb-47aa-46d0-8fcd-59afae250c3d/participants.json"
);

// Parse pilot rows from the overall results HTML
function parsePilotsFromHtml(html) {
  const pilots = [];
  const rowRegex =
    /<tr class="fs_res_res_row"[^>]*>([\s\S]*?)<\/tr>/g;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const cells = [];
    const cellRegex = /<td class="fs_res"[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      let value = cellMatch[1].replace(/<[^>]+>/g, "").trim();
      cells.push(value);
    }

    // The pilot table has 7+ cells: #, Dorsal, Name, M/F, Nation, Glider, Category, ...scores
    if (cells.length < 7) continue;

    const id = parseInt(cells[1], 10);
    if (isNaN(id)) continue;

    const genderRaw = cells[3];
    const genre = genderRaw === "M" ? "MALE" : genderRaw === "F" ? "FEMALE" : undefined;
    const nation = cells[4] || undefined;
    const glider = cells[5] || undefined;
    const gliderClass = cells[6] || undefined;

    pilots.push({ id, genre, nation, glider, gliderClass });
  }

  return pilots;
}

// Main
const html = fs.readFileSync(HTML_PATH, "utf-8");
const htmlPilots = parsePilotsFromHtml(html);
console.log(`Parsed ${htmlPilots.length} pilots from HTML`);

const participants = JSON.parse(fs.readFileSync(PARTICIPANTS_PATH, "utf-8"));
let merged = 0;

for (const participant of participants) {
  const htmlPilot = htmlPilots.find((p) => p.id === participant.id);
  if (!htmlPilot) continue;

  if (htmlPilot.genre) participant.genre = htmlPilot.genre;
  if (htmlPilot.nation) participant.nation = htmlPilot.nation;
  if (htmlPilot.glider) participant.glider = htmlPilot.glider;
  if (htmlPilot.gliderClass) participant.gliderClass = htmlPilot.gliderClass;
  merged++;
}

fs.writeFileSync(PARTICIPANTS_PATH, JSON.stringify(participants, null, 2) + "\n");
console.log(`Merged metadata for ${merged}/${participants.length} participants`);
console.log("Done.");
