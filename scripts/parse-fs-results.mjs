#!/usr/bin/env node
/**
 * Parse FS HTML result files into JSON for use as expected test results.
 *
 * Usage: node scripts/parse-fs-results.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TASKS = [
  {
    name: "task10",
    htmlPath: "docs/test-data/lliga-catalana/T10/FS_result_reference_task10.html",
    taskId: "bc852108-262d-432c-a013-cbf602904a97",
  },
  {
    name: "task11",
    htmlPath: "docs/test-data/lliga-catalana/T11/FS_result_reference_task11.html",
    taskId: "0d27cc2d-518a-48e5-9c06-31880823ce71",
  },
  {
    name: "task12",
    htmlPath: "docs/test-data/lliga-catalana/T12/FS_result_reference_task12.html",
    taskId: "a4e2c6ad-9f94-4a3f-b109-3eb886359b4b",
  },
];

function parseHtml(html) {
  // Extract pilot rows
  const pilotResults = [];
  const rowRegex =
    /<tr class="fs_res_res_row"[^>]*>([\s\S]*?)<\/tr>/g;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const cells = [];
    const cellRegex = /<td class="fs_res"[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // Strip HTML tags and trim
      let value = cellMatch[1].replace(/<[^>]+>/g, "").trim();
      cells.push(value);
    }

    if (cells.length < 13) continue;

    // Columns: 0=rank, 1=dorsal, 2=name, 3=gender, 4=nation, 5=glider, 6=category,
    //          7=SSS, 8=ESS, 9=time, 10=speed, 11=distance, 12=distPoints, 13=leadPoints, 14=timePoints, 15=total
    const rank = parseInt(cells[0], 10);
    const pilotId = parseInt(cells[1], 10);
    const name = cells[2];
    const sssTime = cells[7] || null;
    const essTime = cells[8] || null;
    const timeStr = cells[9] || null;
    const speed = cells[10] ? parseFloat(cells[10]) : null;
    const distanceKm = cells[11] ? parseFloat(cells[11]) : null;
    const distancePoints = cells[12] ? parseFloat(cells[12]) : 0;
    const leadingPoints = cells[13] ? parseFloat(cells[13]) : 0;
    const timePoints = cells[14] ? parseFloat(cells[14]) : 0;
    const totalPoints = cells[15] ? parseFloat(cells[15]) : 0;

    // Parse time string h:m:s to seconds
    let timeSeconds = null;
    if (timeStr) {
      const parts = timeStr.split(":");
      if (parts.length === 3) {
        timeSeconds =
          parseInt(parts[0], 10) * 3600 +
          parseInt(parts[1], 10) * 60 +
          parseInt(parts[2], 10);
      }
    }

    const reachedESS = essTime !== null && essTime !== "";
    const reachedGoal = reachedESS; // In goal-race tasks, ESS finishers reach goal

    pilotResults.push({
      pilotId,
      rank,
      distance: distanceKm ? Math.round(distanceKm * 1000) : 0,
      time: timeSeconds,
      reachedGoal,
      reachedESS,
      distancePoints,
      timePoints,
      arrivalPoints: 0,
      leadingPoints,
      departurePoints: 0,
      penalties: [],
      penaltyPoints: 0,
      totalPoints,
    });
  }

  // Extract footer statistics (param/value tables)
  const stats = {};
  const paramRegex =
    /<td class="fs_res">([^<]+)<\/td>\s*<td class="fs_res"[^>]*>\s*([^<]*)\s*<\/td>/g;
  let paramMatch;

  while ((paramMatch = paramRegex.exec(html)) !== null) {
    const key = paramMatch[1].trim();
    const value = paramMatch[2].trim();
    stats[key] = value;
  }

  return { pilotResults, stats };
}

function buildTaskResult(taskConfig, parsed) {
  const { pilotResults, stats } = parsed;

  const pilotsPresent = parseInt(stats["no_of_pilots_present"] || "0", 10);
  const pilotsFlying = parseInt(stats["no_of_pilots_flying"] || "0", 10);
  const pilotsInGoal = parseInt(
    stats["no_of_pilots_reaching_goal"] || "0",
    10
  );
  const pilotsReachedESS = parseInt(
    stats["no_of_pilots_reaching_es"] || "0",
    10
  );
  const bestDistKm = parseFloat(stats["best_dist"] || "0");
  const bestTimeHours = parseFloat(stats["best_time"] || "0");
  const goalRatio = parseFloat(stats["goalratio"] || "0");

  const distanceWeight = parseFloat(stats["distance_weight"] || "0");
  const timeWeight = parseFloat(stats["time_weight"] || "0");
  const leadingWeight = parseFloat(stats["leading_weight"] || "0");

  const distanceAvailable = parseFloat(
    stats["available_points_distance"] || "0"
  );
  const timeAvailable = parseFloat(stats["available_points_time"] || "0");
  const leadingAvailable = parseFloat(
    stats["available_points_leading"] || "0"
  );
  const arrivalAvailable = parseFloat(
    stats["available_points_arrival"] || "0"
  );
  const departureAvailable = parseFloat(
    stats["available_points_departure"] || "0"
  );

  const timeValidity = parseFloat(stats["time_validity"] || "1");
  const launchValidity = parseFloat(stats["launch_validity"] || "1");
  const distanceValidity = parseFloat(stats["distance_validity"] || "1");
  const stopValidity = parseFloat(stats["stop_validity"] || "1");
  const dayQuality = parseFloat(stats["day_quality"] || "1");

  const smallestLeadingCoeff = parseFloat(
    stats["smallest_leading_coefficient"] || "0"
  );
  const taskDistanceKm = parseFloat(stats["task_distance"] || "0");
  const ssDistanceKm = parseFloat(stats["ss_distance"] || "0");

  const sumDistOverMinKm = parseFloat(stats["sum_dist_over_min"] || "0");

  const totalAvailable =
    distanceAvailable +
    timeAvailable +
    leadingAvailable +
    arrivalAvailable +
    departureAvailable;

  return {
    taskId: taskConfig.taskId,
    taskName: taskConfig.name.charAt(0).toUpperCase() + taskConfig.name.slice(1),
    taskDate: "",
    scoredAt: new Date().toISOString(),
    formula: "GAP2023",
    timeValidity,
    launchValidity,
    distanceValidity,
    stopValidity,
    dayQuality,
    availablePoints: {
      totalAvailable,
      distanceAvailable,
      timeAvailable,
      arrivalAvailable: arrivalAvailable,
      leadingAvailable,
      departureAvailable: departureAvailable,
    },
    statistics: {
      pilotsPresent,
      pilotsFlying,
      pilotsLaunched: pilotsFlying,
      pilotsLandedBeforeDeadline: pilotsFlying,
      pilotsInGoal,
      pilotsReachedESS,
      bestDistance: Math.round(bestDistKm * 1000),
      sumOfFlownDistancesOverMin: sumDistOverMinKm * 1000,
      maxDistanceOverMin: Math.round(bestDistKm * 1000) - 5000,
      minDistance: 5000,
      bestTime: bestTimeHours * 3600,
      bestFinishTime: 0,
      lastFinishTime: 0,
      sumOfLeadingCoeffs: 0,
      smallestLeadingCoeff,
      leadingWeightFactor: 1,
      nominalDistance: 25000,
      nominalTime: 3600,
      nominalGoal: 0.15,
      nominalLaunch: 0.96,
    },
    fsStats: {
      taskDistanceKm,
      ssDistanceKm,
      goalRatio,
      distanceWeight,
      timeWeight,
      leadingWeight,
    },
    pilotResults,
  };
}

// Main
for (const taskConfig of TASKS) {
  const htmlPath = path.join(ROOT, taskConfig.htmlPath);

  if (!fs.existsSync(htmlPath)) {
    console.warn(`Skipping ${taskConfig.name}: ${htmlPath} not found`);
    continue;
  }

  const html = fs.readFileSync(htmlPath, "utf-8");
  const parsed = parseHtml(html);
  const result = buildTaskResult(taskConfig, parsed);

  const outDir = path.join(
    ROOT,
    "tests/fixtures/lliga-catalana/expected-results"
  );
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${taskConfig.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");

  console.log(
    `${taskConfig.name}: ${result.pilotResults.length} pilots, ` +
      `${result.statistics.pilotsInGoal} in goal, ` +
      `best=${result.statistics.bestDistance}m, ` +
      `smallestLC=${result.statistics.smallestLeadingCoeff}`
  );
}

console.log("Done.");
