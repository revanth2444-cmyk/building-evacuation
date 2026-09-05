/**
 * Infrastructure Capacity & Queue Types (EVACUATE-AI Phase B)
 * Models throughput flow rates, queue queues, occupancy limits, and utilization metrics
 * for Doors, Emergency Staircases, and Ground Floor Exits.
 */

import { FloorId } from '../types/building';

export type InfrastructureType = 'door' | 'staircase' | 'exit';

export type InfrastructureState =
  | 'AVAILABLE'
  | 'BUSY'
  | 'CONGESTED'
  | 'FULL'
  | 'BLOCKED';

export interface QueuedOccupant {
  agentId: string;
  arrivalTime: number; // Simulation elapsed time when agent entered the queue
  approachDistance: number;
}

export interface DoorCapacityConfig {
  id: string; // e.g. "F1_DOOR_101_A", "F4_DOOR_401"
  name: string;
  floor: FloorId;
  widthMeters: number;
  flowRatePersonsPerSecond: number; // Max rate of people passing through per second
  enabled: boolean;
}

export interface StaircaseCapacityConfig {
  id: string; // "STAIR_WEST" or "STAIR_EAST"
  name: string;
  maxSimultaneousOccupants: number; // Max concurrent people inside the stairwell (e.g. 25)
  flowRatePersonsPerSecond: number; // Rate of entry at landings (e.g. 1.5 p/s)
  enabled: boolean;
  isAccessible: boolean;
}

export interface ExitCapacityConfig {
  id: string; // "F1_EXIT_NORTH", "F1_EXIT_SOUTH", "F1_EXIT_WEST", "F1_EXIT_EAST"
  name: string;
  widthMeters: number;
  flowRatePersonsPerSecond: number; // Discharge rate (e.g. 2.5 p/s)
  maxQueueLength?: number;
  enabled: boolean;
}

export interface CapacityInfrastructureMetrics {
  id: string;
  name: string;
  type: InfrastructureType;
  floor: FloorId;
  state: InfrastructureState;
  currentOccupancy: number;
  maxOccupancy?: number;
  flowRate: number; // Configured persons per second
  currentThroughput: number; // Realized throughput (persons / sec)
  totalProcessed: number;
  currentQueueLength: number;
  maxQueueLength: number;
  totalWaitTime: number; // Cumulative wait time in seconds across all occupants
  utilization: number; // 0.0 to 1.0
  queuedAgentIds: string[];
}

export interface SimulationCapacitySummary {
  totalQueueWaitingTime: number;
  maxDoorQueue: { id: string; name: string; length: number };
  maxStaircaseQueue: { id: string; name: string; length: number };
  maxExitQueue: { id: string; name: string; length: number };
  averageDoorUtilization: number;
  averageStaircaseUtilization: number;
  averageExitUtilization: number;
}
