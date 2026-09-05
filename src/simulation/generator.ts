/**
 * Deterministic Agent Generator
 * Generates 100-200 simulated occupants with behavioral profiles, physical traits,
 * and initial A* routes using a reproducible pseudo-random seed.
 */

import { buildingRegistry, getFloorElevation } from '../data/buildingRegistry';
import { AStarPathfinder } from '../graph/pathfinding';
import { EvacuationGraph } from '../graph/types';
import { DEFAULT_PERSONAL_SPACE_RADIUS, WHEELCHAIR_PERSONAL_SPACE_RADIUS } from './constants';
import { BehaviorProfile, MobilityType, SimulatedAgent } from './types';

// Mulberry32 32-bit deterministic PRNG
export class SeededPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed ? Math.abs(seed) : 123456789;
  }

  // Returns pseudo-random float in [0, 1)
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns pseudo-random float in [min, max)
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Returns pseudo-random integer in [min, max]
  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Pick random element from array
  public pick<T>(arr: T[]): T {
    const idx = Math.floor(this.next() * arr.length);
    return arr[Math.min(idx, arr.length - 1)];
  }
}

export const PROFILE_COLORS: Record<BehaviorProfile, string> = {
  NORMAL: '#38bdf8', // Sky blue
  FAMILIAR: '#22c55e', // Emerald green
  UNFAMILIAR: '#eab308', // Amber yellow
  DELAYED: '#a855f7', // Purple
  PANIC: '#ef4444', // Red
  NON_COMPLIANT: '#f97316', // Orange
  REDUCED_MOBILITY: '#06b6d4', // Cyan
};

export class AgentGenerator {
  /**
   * Generates a deterministic fleet of occupants across all 5 floors
   */
  public static generateFleet(
    graph: EvacuationGraph,
    count = 150,
    seed = 42
  ): SimulatedAgent[] {
    const prng = new SeededPRNG(seed);
    const agents: SimulatedAgent[] = [];

    // Filter available rooms across floors (excluding corridors/shafts)
    const rooms = buildingRegistry.rooms.filter((r) => r.capacity > 0);

    // Profile distribution weights
    const profileWeights: { profile: BehaviorProfile; weight: number }[] = [
      { profile: 'NORMAL', weight: 42 },
      { profile: 'FAMILIAR', weight: 22 },
      { profile: 'UNFAMILIAR', weight: 14 },
      { profile: 'DELAYED', weight: 8 },
      { profile: 'PANIC', weight: 6 },
      { profile: 'NON_COMPLIANT', weight: 5 },
      { profile: 'REDUCED_MOBILITY', weight: 3 },
    ];

    const pickProfile = (): BehaviorProfile => {
      const totalWeight = profileWeights.reduce((sum, p) => sum + p.weight, 0);
      let rand = prng.range(0, totalWeight);
      for (const item of profileWeights) {
        if (rand < item.weight) return item.profile;
        rand -= item.weight;
      }
      return 'NORMAL';
    };

    // Calculate total room capacity to distribute agents realistically
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);

    for (let i = 1; i <= count; i++) {
      const id = `AGENT_${String(i).padStart(3, '0')}`;
      const profile = pickProfile();

      // Pick room weighted by capacity
      let rTarget = prng.range(0, totalCapacity);
      let selectedRoom = rooms[0];
      for (const room of rooms) {
        if (rTarget < room.capacity) {
          selectedRoom = room;
          break;
        }
        rTarget -= room.capacity;
      }

      // Small jitter inside room boundaries
      const halfW = Math.max(0.5, selectedRoom.dimensions.x * 0.35);
      const halfD = Math.max(0.5, selectedRoom.dimensions.z * 0.35);
      const spawnX = Number((selectedRoom.position.x + prng.range(-halfW, halfW)).toFixed(2));
      const spawnZ = Number((selectedRoom.position.z + prng.range(-halfD, halfD)).toFixed(2));
      const spawnY = getFloorElevation(selectedRoom.floor);

      const spawnPos = { x: spawnX, y: spawnY, z: spawnZ };
      const roomNodeId = `NODE_${selectedRoom.id}`;

      // Profile-specific behavioral attributes
      let walkingSpeed = 1.25;
      let reactionTime = 3.0;
      let awareness = 0.8;
      let panicLevel = 0.1;
      let compliance = 0.9;
      let mobilityType: MobilityType = 'standard';

      switch (profile) {
        case 'NORMAL':
          walkingSpeed = prng.range(1.15, 1.35);
          reactionTime = prng.range(2.0, 5.0);
          awareness = prng.range(0.75, 0.85);
          panicLevel = prng.range(0.05, 0.2);
          compliance = prng.range(0.85, 0.95);
          break;

        case 'FAMILIAR':
          walkingSpeed = prng.range(1.3, 1.55);
          reactionTime = prng.range(1.0, 3.0);
          awareness = prng.range(0.9, 1.0);
          panicLevel = prng.range(0.0, 0.15);
          compliance = prng.range(0.9, 1.0);
          break;

        case 'UNFAMILIAR':
          walkingSpeed = prng.range(1.0, 1.2);
          reactionTime = prng.range(4.0, 9.0);
          awareness = prng.range(0.4, 0.6);
          panicLevel = prng.range(0.2, 0.45);
          compliance = prng.range(0.7, 0.85);
          break;

        case 'DELAYED':
          walkingSpeed = prng.range(1.1, 1.3);
          reactionTime = prng.range(10.0, 22.0); // Packing, securing equipment
          awareness = prng.range(0.6, 0.8);
          panicLevel = prng.range(0.1, 0.3);
          compliance = prng.range(0.65, 0.8);
          break;

        case 'PANIC':
          walkingSpeed = prng.range(1.5, 1.9); // Fast rushing speed
          reactionTime = prng.range(0.5, 2.5);
          awareness = prng.range(0.3, 0.6);
          panicLevel = prng.range(0.75, 1.0);
          compliance = prng.range(0.3, 0.6);
          break;

        case 'NON_COMPLIANT':
          walkingSpeed = prng.range(1.0, 1.25);
          reactionTime = prng.range(18.0, 35.0); // Ignores alarm initially
          awareness = prng.range(0.5, 0.7);
          panicLevel = prng.range(0.05, 0.2);
          compliance = prng.range(0.1, 0.35);
          break;

        case 'REDUCED_MOBILITY':
          walkingSpeed = prng.range(0.55, 0.85);
          reactionTime = prng.range(4.0, 8.0);
          awareness = prng.range(0.7, 0.9);
          panicLevel = prng.range(0.1, 0.3);
          compliance = prng.range(0.9, 1.0);
          mobilityType = prng.next() > 0.5 ? 'reduced_mobility' : 'wheelchair';
          break;
      }

      // Compute initial A* evacuation path from spawn room node to nearest safe exit
      const pathResult = AStarPathfinder.findNearestExit(graph, roomNodeId, {
        wheelchairOnly: mobilityType === 'wheelchair',
        avoidHazards: true,
      });

      // Construct waypoints starting from agent's exact physical spawn coordinate
      // followed by the graph node positions along the calculated route
      const waypoints = [
        { ...spawnPos },
        ...pathResult.waypoints,
      ];

      const targetExit = pathResult.targetNodeId || 'NODE_F1_EXIT_SOUTH';
      const personalSpace =
        mobilityType === 'wheelchair'
          ? WHEELCHAIR_PERSONAL_SPACE_RADIUS
          : DEFAULT_PERSONAL_SPACE_RADIUS;

      const agent: SimulatedAgent = {
        id,
        name: `Occupant #${i} (${profile})`,
        profile,
        mobilityType,
        status: 'idle',
        currentFloor: selectedRoom.floor,
        position: { ...spawnPos },
        currentNodeId: roomNodeId,
        destination: targetExit,
        targetExitId: targetExit,
        currentRoute: pathResult.nodeIds,
        routeWaypoints: waypoints,
        currentWaypointIndex: 1, // First target is index 1 (the room center or door)
        walkingSpeed: Number(walkingSpeed.toFixed(2)),
        currentSpeed: Number(walkingSpeed.toFixed(2)),
        reactionTime: Number(reactionTime.toFixed(1)),
        reactionRemaining: Number(reactionTime.toFixed(1)),
        awareness: Number(awareness.toFixed(2)),
        panicLevel: Number(panicLevel.toFixed(2)),
        compliance: Number(compliance.toFixed(2)),
        personalSpaceRadius: personalSpace,
        spawnFloor: selectedRoom.floor,
        spawnPosition: { ...spawnPos },
        spawnRoomId: selectedRoom.id,
        distanceTraveled: 0,
        queueWaitTime: 0,
        isBlockedOrQueued: false,
        hazardExposure: 0,
        riskScore: 0,
        currentCongestionState: 'LOW',
        color: PROFILE_COLORS[profile],
      };

      agents.push(agent);
    }

    return agents;
  }
}
