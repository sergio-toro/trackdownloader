/**
 * Comprehensive UUID cleanup for data files
 *
 * Uses migration-log.json to build UUID→slug maps and fixes all remaining
 * UUID references in standings, results, and category result files.
 *
 * Usage: node scripts/fix-remaining-uuids.mjs [dataDir]
 * Default dataDir: ./data
 */

import fs from "fs/promises";
import path from "path";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf-8"));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function isUuid(s) { return UUID_RE.test(s); }

/** Rewrite taskScores keys and discardedTasks in a standings array */
function fixStandings(standings, taskMap) {
  let changed = false;
  for (const standing of standings) {
    if (standing.taskScores && typeof standing.taskScores === "object" && !Array.isArray(standing.taskScores)) {
      const newScores = {};
      for (const [key, value] of Object.entries(standing.taskScores)) {
        const newKey = taskMap[key] || key;
        if (newKey !== key) changed = true;
        newScores[newKey] = value;
      }
      standing.taskScores = newScores;
    }
    if (Array.isArray(standing.discardedTasks)) {
      standing.discardedTasks = standing.discardedTasks.map((id) => {
        const newId = taskMap[id] || id;
        if (newId !== id) changed = true;
        return newId;
      });
    }
  }
  return changed;
}

async function fixCompetition(compDir, taskMap, compName) {
  console.log(`\nCompetition: "${compName}" (${path.basename(compDir)})`);

  if (Object.keys(taskMap).length === 0) {
    console.log("  No task mappings — skipping.");
    return;
  }

  console.log(`  Task map: ${JSON.stringify(taskMap)}`);
  let totalFixes = 0;

  // Fix results/{slug}.json — taskId field
  const resultsDir = path.join(compDir, "results");
  if (await exists(resultsDir)) {
    const files = (await fs.readdir(resultsDir)).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(resultsDir, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) continue;
      const data = await readJson(filePath);
      if (data.taskId && taskMap[data.taskId]) {
        data.taskId = taskMap[data.taskId];
        await writeJson(filePath, data);
        console.log(`  Fixed results/${file} (taskId)`);
        totalFixes++;
      }
    }
  }

  // Fix overall-results.json
  const overallPath = path.join(compDir, "overall-results.json");
  if (await exists(overallPath)) {
    const overall = await readJson(overallPath);
    if (overall.standings && fixStandings(overall.standings, taskMap)) {
      await writeJson(overallPath, overall);
      console.log(`  Fixed overall-results.json`);
      totalFixes++;
    }
  }

  // Fix category-results/*.json
  const catStandingsDir = path.join(compDir, "category-results");
  if (await exists(catStandingsDir)) {
    const files = (await fs.readdir(catStandingsDir)).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(catStandingsDir, file);
      const data = await readJson(filePath);
      if (data.standings && fixStandings(data.standings, taskMap)) {
        await writeJson(filePath, data);
        console.log(`  Fixed category-results/${file}`);
        totalFixes++;
      }
    }
  }

  // Fix team-results/*.json (standings[*].taskScores[*].taskId)
  const teamDir = path.join(compDir, "team-results");
  if (await exists(teamDir)) {
    const files = (await fs.readdir(teamDir)).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(teamDir, file);
      const data = await readJson(filePath);
      let changed = false;
      if (data.standings) {
        for (const standing of data.standings) {
          if (Array.isArray(standing.taskScores)) {
            for (const ts of standing.taskScores) {
              if (ts.taskId && taskMap[ts.taskId]) {
                ts.taskId = taskMap[ts.taskId];
                changed = true;
              }
            }
          }
        }
      }
      if (changed) {
        await writeJson(filePath, data);
        console.log(`  Fixed team-results/${file}`);
        totalFixes++;
      }
    }
  }

  // Fix results/categories/ — rename files with UUID task prefix, fix taskId inside
  const catResultsDir = path.join(resultsDir, "categories");
  if (await exists(catResultsDir)) {
    const files = (await fs.readdir(catResultsDir)).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const underscoreIdx = file.indexOf("_");
      if (underscoreIdx <= 0) continue;

      const taskPart = file.slice(0, underscoreIdx);
      const needsRename = isUuid(taskPart) && !!taskMap[taskPart];
      const newFileName = needsRename
        ? `${taskMap[taskPart]}${file.slice(underscoreIdx)}`
        : file;

      const filePath = path.join(catResultsDir, file);
      const data = await readJson(filePath);
      let changed = false;
      if (data.taskId && taskMap[data.taskId]) {
        data.taskId = taskMap[data.taskId];
        changed = true;
      }

      if (needsRename || changed) {
        const newPath = path.join(catResultsDir, newFileName);
        await writeJson(newPath, data);
        if (needsRename && newFileName !== file) {
          await fs.unlink(filePath);
        }
        console.log(`  Fixed results/categories/${file}${needsRename ? ` → ${newFileName}` : ""}`);
        totalFixes++;
      }
    }
  }

  console.log(`  Total fixes: ${totalFixes}`);
}

async function migrate(dataDir) {
  // Load migration log for UUID→slug mappings
  const logPath = path.join(dataDir, "migration-log.json");
  if (!(await exists(logPath))) {
    console.log("No migration-log.json found. Cannot determine UUID→slug mappings.");
    return;
  }

  const log = await readJson(logPath);
  const competitionsDir = path.join(dataDir, "competitions");

  for (const comp of log.competitions) {
    const compDir = path.join(competitionsDir, comp.newCompSlug);
    if (!(await exists(compDir))) {
      console.log(`Skipping ${comp.newCompSlug} — directory not found.`);
      continue;
    }

    const taskMap = {};
    for (const t of comp.tasks) {
      taskMap[t.oldId] = t.newId;
    }

    await fixCompetition(compDir, taskMap, comp.compName);
  }

  console.log("\nUUID cleanup complete.");
}

const dataDir = process.argv[2] || path.resolve("data");
migrate(dataDir).catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
