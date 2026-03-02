/**
 * Participant and task participant types
 */

import type { ParticipantStatus, TaskStatus, PenaltyType } from "./competition";

/**
 * Track uploaded for a specific task
 */
export interface TaskTrack {
  taskId: string;
  igcPath: string;
  uploadedAt: string;
}

/**
 * Competition participant
 */
export interface Participant {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  nation?: string; // ISO 3166-1 alpha-3
  civlId?: number;
  faiId?: string;
  glider?: string;
  gliderClass?: string;
  sponsor?: string;
  status: ParticipantStatus;
  taskTracks?: TaskTrack[];
}

/**
 * Penalty applied to a participant
 */
export interface Penalty {
  type: PenaltyType;
  points: number;
  reason: string;
  appliedAt?: string;
}

/**
 * Participant timing information for a task
 */
export interface ParticipantTiming {
  startedSS?: number; // Unix timestamp ms
  finishedSS?: number; // Unix timestamp ms
  finishedTask?: number; // Unix timestamp ms
}

/**
 * Participant altitude information
 */
export interface ParticipantAltitudes {
  takeoff?: number;
  maxAltitude?: number;
  essAltitude?: number;
  goalAltitude?: number;
}

/**
 * Participant data specific to a task
 */
export interface TaskParticipant {
  participantId: number;
  participant?: Participant;
  status: TaskStatus;
  distance: number; // meters flown
  timing: ParticipantTiming;
  reachedGoal: boolean;
  tracklogInfo?: {
    filename: string;
    uploadedAt: string;
  };
  altitudes: ParticipantAltitudes;
  penalties: {
    manual: Penalty[];
    auto: Penalty[];
  };
  speed?: number; // km/h
  notes?: string;
}
