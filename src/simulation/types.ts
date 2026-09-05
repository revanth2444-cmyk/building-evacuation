/**
 * Simulation & Agent Types for EVACUATE-AI Phase 3
 * Models realistic human occupant behaviors, physical movement, and egress dynamics.
 */

import { FloorId, Vector3D } from '../types/building';

export type BehaviorProfile =
  | 'NORMAL'
  | 'FAMILIAR'
  | 'UNFAMILIAR'
  | 'DELAYED'
  | 'PANIC'
  | 'NON_COMPLIANT'
  | 'REDUCED_MOBILITY';

export type MobilityType = 'standard' | 'reduced_mobility' | 'wheelchair';

export type AgentStatus = 'idle' | 'reacting' | 'evacuating' | 'queued' | 'evacuated';

export type CongestionLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SimulatedAgent {
  id: string; // Unique deterministic ID: e.g. "AGENT_001"
  name: string;
  profile: BehaviorProfile;
  mobilityType: MobilityType;
  status: AgentStatus;

  // Spatial & Graph Tracking
  currentFloor: FloorId;
  position: Vector3D; // Continuous 3D world coordinate [x, y, z]
  currentNodeId: string;
  destination: string; // Designated final destination / discharge target
  targetExitId: string; // Designated final discharge exit node ID
  currentRoute: string[]; // Sequence of Graph Node IDs to traverse
  routeWaypoints: Vector3D[]; // 3D waypoints matching graph geometry
  currentWaypointIndex: number;

  // Behavioral & Physical Attributes
  walkingSpeed: number; // Base walking speed in m/s (1.0 to 1.6 m/s)
  currentSpeed: number; // Actual current speed (adjusted on stairs/crowds)
  reactionTime: number; // Initial delay in seconds before evacuating
  reactionRemaining: number; // Seconds left before movement begins
  awareness: number; // Egress awareness (0.0 to 1.0)
  panicLevel: number; // Current panic level (0.0 to 1.0)
  compliance: number; // Propensity to follow emergency directions (0.0 to 1.0)
  personalSpaceRadius: number; // Physical clearance radius in meters (0.45m - 0.65m)

  // Simulation Telemetry & State
  spawnFloor: FloorId;
  spawnPosition: Vector3D;
  spawnRoomId: string;
  distanceTraveled: number; // Meters moved so far
  queueWaitTime: number; // Total seconds spent slowed or waiting in queues
  isBlockedOrQueued: boolean; // Flag indicating agent is currently halted or slowed by ahead occupant
  hazardExposure: number; // Hazard exposure level (0.0 - 1.0)
  riskScore: number; // Computed risk score (0.0 - 1.0)
  currentCongestionState: CongestionLevel; // Congestion level
  currentQueueId?: string; // ID of infrastructure where agent is currently queued
  queueStartTime?: number; // Simulation timestamp when current queueing began
  currentInfrastructureId?: string; // ID of infrastructure being traversed
  evacuationTime?: number; // Total seconds taken from simulation start to evacuation
  color: string; // Hex color for 3D visualization
}

export * from './capacityTypes';

export interface SimulationMetrics {
  totalAgents: number;
  evacuatedAgents: number;
  remainingAgents: number;
  reactingAgents: number;
  queuedAgents: number;
  elapsedTime: number; // in seconds
  averageEvacuationTime: number; // in seconds
  evacuationProgress: number; // 0 to 100 percentage
}

export interface SimulationConfig {
  seed: number;
  agentCount: number; // 100 to 200 agents
  simulationSpeed: number; // 1x, 2x, 5x, 10x
}
