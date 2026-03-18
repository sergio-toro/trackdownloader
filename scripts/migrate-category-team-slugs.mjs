/**
 * Migration script: UUID → slug-based IDs for categories and teams
 *
 * Migrates category and team IDs within already-migrated data/competitions/ directory.
 *
 * Usage: node scripts/migrate-category-team-slugs.mjs [dataDir]
 * Default dataDir: ./data
 */

import fs from "fs/promises";
import path from "path";

// --- Slug utilities ---

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

// --- Main migration ---

async function migrate(dataDir) {
  const competitionsDir = path.join(dataDir, "competitions");
  if (!(await exists(competitionsDir))) {
    console.log("No competitions/ directory found. Nothing to migrate.");
    return;
  }

  const entries = await fs.readdir(competitionsDir, { withFileTypes: true });
  const compFolders = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await exists(path.join(competitionsDir, entry.name, "competition.json"))) {
      compFolders.push(entry.name);
    }
  }

  if (compFolders.length === 0) {
    console.log("No competitions found.");
    return;
  }

  console.log(`Found ${compFolders.length} competition(s).`);

  for (const compFolder of compFolders) {
    const compDir = path.join(competitionsDir, compFolder);
    const compJson = await readJson(path.join(compDir, "competition.json"));

    console.log(`\nCompetition: "${compJson.name}" (${compFolder})`);

    // --- Migrate Categories ---
    const categories = compJson.categories || [];
    const categoryRenameMap = {};
    const usedCatSlugs = [];

    for (const cat of categories) {
      const oldId = cat.id;
      const newSlug = ensureUniqueSlug(toSlug(cat.name), usedCatSlugs);
      usedCatSlugs.push(newSlug);

      if (oldId !== newSlug) {
        categoryRenameMap[oldId] = newSlug;
        cat.id = newSlug;
        console.log(`  Category: "${cat.name}" → ${oldId} → ${newSlug}`);
      }
    }

    // Rename category standings files
    const catStandingsDir = path.join(compDir, "category-results");
    if (await exists(catStandingsDir)) {
      for (const [oldId, newId] of Object.entries(categoryRenameMap)) {
        const oldFile = path.join(catStandingsDir, `${oldId}.json`);
        const newFile = path.join(catStandingsDir, `${newId}.json`);
        if (await exists(oldFile)) {
          // Also fix competitionId inside
          const data = await readJson(oldFile);
          if (data.competitionId && data.competitionId !== compFolder) {
            data.competitionId = compFolder;
          }
          await writeJson(newFile, data);
          await fs.unlink(oldFile);
        }
      }
      // Fix competitionId in non-renamed standings too
      const standingsFiles = await fs.readdir(catStandingsDir);
      for (const file of standingsFiles) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(catStandingsDir, file);
        const data = await readJson(filePath);
        if (data.competitionId && data.competitionId !== compFolder) {
          data.competitionId = compFolder;
          await writeJson(filePath, data);
        }
      }
    }

    // Rename category task result files
    const catResultsDir = path.join(compDir, "results", "categories");
    if (await exists(catResultsDir)) {
      for (const [oldId, newId] of Object.entries(categoryRenameMap)) {
        const files = await fs.readdir(catResultsDir);
        const suffix = `_${oldId}.json`;
        for (const file of files) {
          if (file.endsWith(suffix)) {
            const prefix = file.slice(0, -suffix.length);
            await fs.rename(
              path.join(catResultsDir, file),
              path.join(catResultsDir, `${prefix}_${newId}.json`)
            );
          }
        }
      }
    }

    // --- Migrate Teams ---
    const teams = compJson.teams || [];
    const teamRenameMap = {};
    const usedTeamSlugs = [];

    for (const team of teams) {
      const oldId = team.id;
      const newSlug = ensureUniqueSlug(toSlug(team.name), usedTeamSlugs);
      usedTeamSlugs.push(newSlug);

      if (oldId !== newSlug) {
        teamRenameMap[oldId] = newSlug;
        team.id = newSlug;
        console.log(`  Team: "${team.name}" → ${oldId} → ${newSlug}`);
      }
    }

    // Rename team result files and update content
    const teamResultsDir = path.join(compDir, "team-results");
    if (await exists(teamResultsDir)) {
      for (const [oldId, newId] of Object.entries(teamRenameMap)) {
        const oldFile = path.join(teamResultsDir, `${oldId}.json`);
        const newFile = path.join(teamResultsDir, `${newId}.json`);
        if (await exists(oldFile)) {
          const data = await readJson(oldFile);
          data.teamDefinitionId = newId;
          if (data.competitionId && data.competitionId !== compFolder) {
            data.competitionId = compFolder;
          }
          await writeJson(newFile, data);
          await fs.unlink(oldFile);
        }
      }
    }

    // Write updated competition.json
    if (Object.keys(categoryRenameMap).length > 0 || Object.keys(teamRenameMap).length > 0) {
      await writeJson(path.join(compDir, "competition.json"), compJson);
      console.log(`  Updated competition.json`);
    }
  }

  console.log("\nCategory/team migration complete.");
}

// --- Entry point ---

const dataDir = process.argv[2] || path.resolve("data");
migrate(dataDir).catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
