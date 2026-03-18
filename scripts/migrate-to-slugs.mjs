/**
 * Migration script: UUID identifiers → slug-based identifiers
 *
 * Migrates the data directory structure from:
 *   data/{uuid-competition}/tasks/{uuid-task}.json ...
 * To:
 *   data/competitions/{slug-competition}/tasks/{slug-task}.json ...
 *
 * Usage: node scripts/migrate-to-slugs.mjs [dataDir]
 * Default dataDir: ./data
 */

import fs from "fs/promises";
import path from "path";

// --- Slug utilities (duplicated to keep script standalone) ---

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function ensureUniqueSlug(slug, existing) {
  if (!existing.includes(slug)) return slug;
  let counter = 2;
  while (existing.includes(`${slug}-${counter}`)) {
    counter++;
  }
  return `${slug}-${counter}`;
}

// --- Helpers ---

async function readJson(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s) {
  return UUID_RE.test(s);
}

// --- Main migration ---

async function migrate(dataDir) {
  console.log(`Migrating data in: ${dataDir}`);

  // Create competitions/ subdirectory
  const competitionsDir = path.join(dataDir, "competitions");
  await fs.mkdir(competitionsDir, { recursive: true });

  // Find competition folders (UUID-named directories with competition.json)
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  const compFolders = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "competitions" || entry.name === "downloads" || entry.name === "waypoints") continue;
    const compJsonPath = path.join(dataDir, entry.name, "competition.json");
    if (await exists(compJsonPath)) {
      compFolders.push(entry.name);
    }
  }

  if (compFolders.length === 0) {
    console.log("No competition folders found to migrate.");
    return;
  }

  console.log(`Found ${compFolders.length} competition(s) to migrate.`);

  const usedCompSlugs = [];
  const migrationLog = [];

  for (const compFolder of compFolders) {
    const compDir = path.join(dataDir, compFolder);
    const compJson = await readJson(path.join(compDir, "competition.json"));
    const compName = compJson.name;
    const oldCompId = compJson.id;

    // Generate slug
    const baseSlug = toSlug(compName);
    const compSlug = ensureUniqueSlug(baseSlug, usedCompSlugs);
    usedCompSlugs.push(compSlug);

    console.log(`\nCompetition: "${compName}"`);
    console.log(`  ${oldCompId} → ${compSlug}`);

    // --- Migrate tasks ---
    const tasksDir = path.join(compDir, "tasks");
    const resultsDir = path.join(compDir, "results");
    const catResultsDir = path.join(resultsDir, "categories");
    const igcsDir = path.join(compDir, "igcs");

    const taskIdMap = {}; // oldTaskId → newTaskSlug
    const usedTaskSlugs = [];

    if (await exists(tasksDir)) {
      const taskFiles = (await fs.readdir(tasksDir)).filter((f) => f.endsWith(".json"));

      for (const taskFile of taskFiles) {
        const oldTaskId = taskFile.replace(/\.json$/, "");
        const taskJson = await readJson(path.join(tasksDir, taskFile));
        const taskName = taskJson.name;

        const taskSlug = ensureUniqueSlug(toSlug(taskName), usedTaskSlugs);
        usedTaskSlugs.push(taskSlug);

        taskIdMap[oldTaskId] = taskSlug;
        console.log(`  Task: "${taskName}" → ${oldTaskId} → ${taskSlug}`);

        // Update task.id and rename file
        taskJson.id = taskSlug;
        await writeJson(path.join(tasksDir, `${taskSlug}.json`), taskJson);
        if (taskSlug !== oldTaskId) {
          await fs.unlink(path.join(tasksDir, taskFile));
        }

        // Rename result file
        const oldResultPath = path.join(resultsDir, `${oldTaskId}.json`);
        if (await exists(oldResultPath)) {
          const newResultPath = path.join(resultsDir, `${taskSlug}.json`);
          if (taskSlug !== oldTaskId) {
            await fs.rename(oldResultPath, newResultPath);
          }
        }

        // Rename IGC folder (was using first 8 chars of UUID)
        const oldIgcShort = oldTaskId.substring(0, 8);
        const oldIgcFolder = path.join(igcsDir, oldIgcShort);
        if (await exists(oldIgcFolder)) {
          const newIgcFolder = path.join(igcsDir, taskSlug);
          await fs.rename(oldIgcFolder, newIgcFolder);
          console.log(`    IGC: ${oldIgcShort}/ → ${taskSlug}/`);
        }

        // Rename category result files
        if (await exists(catResultsDir)) {
          const catFiles = await fs.readdir(catResultsDir);
          const prefix = `${oldTaskId}_`;
          for (const catFile of catFiles) {
            if (catFile.startsWith(prefix) && catFile.endsWith(".json")) {
              const suffix = catFile.slice(prefix.length);
              const newCatFile = `${taskSlug}_${suffix}`;
              await fs.rename(
                path.join(catResultsDir, catFile),
                path.join(catResultsDir, newCatFile)
              );
            }
          }
        }
      }
    }

    // --- Update participants.json ---
    const participantsPath = path.join(compDir, "participants.json");
    if (await exists(participantsPath)) {
      const participants = await readJson(participantsPath);
      let modified = false;
      for (const p of participants) {
        if (p.taskTracks) {
          for (const t of p.taskTracks) {
            // Update taskId
            if (t.taskId && taskIdMap[t.taskId]) {
              const oldTaskId = t.taskId;
              t.taskId = taskIdMap[t.taskId];
              modified = true;

              // Update igcPath
              if (t.igcPath) {
                // Replace old comp folder with new path
                const oldIgcShort = oldTaskId.substring(0, 8);
                t.igcPath = t.igcPath
                  .replace(`/${oldCompId}/`, `/competitions/${compSlug}/`)
                  .replace(`/igcs/${oldIgcShort}/`, `/igcs/${t.taskId}/`);
              }
            }
          }
        }
      }
      if (modified) {
        await writeJson(participantsPath, participants);
        console.log(`  Updated participants.json`);
      }
    }

    // --- Update overall-results.json ---
    const overallPath = path.join(compDir, "overall-results.json");
    if (await exists(overallPath)) {
      const overall = await readJson(overallPath);
      overall.competitionId = compSlug;

      if (overall.standings) {
        for (const standing of overall.standings) {
          // Update taskScores keys
          if (standing.taskScores) {
            const newScores = {};
            for (const [oldId, value] of Object.entries(standing.taskScores)) {
              const newId = taskIdMap[oldId] || oldId;
              newScores[newId] = value;
            }
            standing.taskScores = newScores;
          }
          // Update discardedTasks
          if (standing.discardedTasks) {
            standing.discardedTasks = standing.discardedTasks.map(
              (id) => taskIdMap[id] || id
            );
          }
        }
      }

      await writeJson(overallPath, overall);
      console.log(`  Updated overall-results.json`);
    }

    // --- Update competition.json ---
    compJson.id = compSlug;
    if (compJson.taskOrder && Array.isArray(compJson.taskOrder)) {
      compJson.taskOrder = compJson.taskOrder.map((id) => taskIdMap[id] || id);
    }
    await writeJson(path.join(compDir, "competition.json"), compJson);

    // --- Move competition folder to competitions/ ---
    const newCompDir = path.join(competitionsDir, compSlug);
    await fs.rename(compDir, newCompDir);
    console.log(`  Moved: ${compFolder}/ → competitions/${compSlug}/`);

    migrationLog.push({
      oldCompId,
      newCompSlug: compSlug,
      compName,
      tasks: Object.entries(taskIdMap).map(([oldId, newId]) => ({ oldId, newId })),
    });
  }

  // Write migration log
  const logPath = path.join(dataDir, "migration-log.json");
  await writeJson(logPath, { migratedAt: new Date().toISOString(), competitions: migrationLog });
  console.log(`\nMigration complete. Log saved to: ${logPath}`);
}

// --- Entry point ---

const dataDir = process.argv[2] || path.resolve("data");
migrate(dataDir).catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
