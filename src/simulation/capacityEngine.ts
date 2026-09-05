/**
 * Infrastructure Capacity & Queue Simulation Engine (Phase B)
 * Models deterministic door throughput flow rates, emergency staircase occupancy limits,
 * multi-floor cascading queues, and rate-limited ground exit discharges.
 */

import { buildingRegistry } from '../data/buildingRegistry';
import { FloorId } from '../types/building';
import {
  CapacityInfrastructureMetrics,
  DoorCapacityConfig,
  ExitCapacityConfig,
  InfrastructureState,
  QueuedOccupant,
  SimulationCapacitySummary,
  StaircaseCapacityConfig,
} from './capacityTypes';

interface DoorRuntimeState {
  config: DoorCapacityConfig;
  lastPassageTime: number;
  waitingQueue: QueuedOccupant[];
  totalProcessed: number;
  totalWaitTime: number;
  maxQueueLength: number;
  busyTime: number;
  recentPassages: number[];
}

interface StaircaseRuntimeState {
  config: StaircaseCapacityConfig;
  currentOccupants: Set<string>;
  landingQueues: Map<string, QueuedOccupant[]>; // Key: landingNodeId e.g. "NODE_STAIR_WEST_LANDING_F4"
  lastEntryTimePerLanding: Map<string, number>;
  totalProcessed: number;
  totalWaitTime: number;
  maxQueueLength: number;
  busyTime: number;
  recentPassages: number[];
}

interface ExitRuntimeState {
  config: ExitCapacityConfig;
  dischargeQueue: QueuedOccupant[];
  lastDischargeTime: number;
  totalProcessed: number;
  totalWaitTime: number;
  maxQueueLength: number;
  busyTime: number;
  recentPassages: number[];
}

export class CapacityEngine {
  private static doors = new Map<string, DoorRuntimeState>();
  private static stairs = new Map<string, StaircaseRuntimeState>();
  private static exits = new Map<string, ExitRuntimeState>();
  private static initialized = false;

  /**
   * Initializes or resets the capacity engine from the building registry
   */
  public static init(force = false): void {
    if (this.initialized && !force) return;

    this.doors.clear();
    this.stairs.clear();
    this.exits.clear();

    // 1. Initialize Doors
    for (const door of buildingRegistry.doors) {
      // Flow rate scaled by width: standard single doors ~1.6 p/s, wide double doors ~2.5 p/s
      const flowRate = Number(Math.max(1.5, Math.min(3.0, door.width * 1.6)).toFixed(1));
      const config: DoorCapacityConfig = {
        id: door.id,
        name: door.name,
        floor: door.floor,
        widthMeters: door.width,
        flowRatePersonsPerSecond: flowRate,
        enabled: !door.isLocked,
      };

      this.doors.set(door.id, {
        config,
        lastPassageTime: -999,
        waitingQueue: [],
        totalProcessed: 0,
        totalWaitTime: 0,
        maxQueueLength: 0,
        busyTime: 0,
        recentPassages: [],
      });
    }

    // 2. Initialize Staircases
    for (const stair of buildingRegistry.stairs) {
      const config: StaircaseCapacityConfig = {
        id: stair.id,
        name: stair.name,
        maxSimultaneousOccupants: 25, // 25 simultaneous occupants per stairwell
        flowRatePersonsPerSecond: 1.5, // 1.5 persons per second entry rate
        enabled: true,
        isAccessible: false,
      };

      const landingQueues = new Map<string, QueuedOccupant[]>();
      const lastEntryTimePerLanding = new Map<string, number>();

      for (const landing of stair.floorLandings) {
        const landingNodeId = `NODE_${stair.stairId}_LANDING_F${landing.floor}`;
        landingQueues.set(landingNodeId, []);
        lastEntryTimePerLanding.set(landingNodeId, -999);
      }

      this.stairs.set(stair.id, {
        config,
        currentOccupants: new Set<string>(),
        landingQueues,
        lastEntryTimePerLanding,
        totalProcessed: 0,
        totalWaitTime: 0,
        maxQueueLength: 0,
        busyTime: 0,
        recentPassages: [],
      });
    }

    // 3. Initialize Exits
    for (const exit of buildingRegistry.exits) {
      let flowRate = 2.5;
      if (exit.id === 'F1_EXIT_SOUTH') flowRate = 3.0;
      else if (exit.id === 'F1_EXIT_WEST' || exit.id === 'F1_EXIT_EAST') flowRate = 1.8;

      const config: ExitCapacityConfig = {
        id: exit.id,
        name: exit.name,
        widthMeters: exit.width,
        flowRatePersonsPerSecond: flowRate,
        enabled: true,
      };

      this.exits.set(exit.id, {
        config,
        dischargeQueue: [],
        lastDischargeTime: -999,
        totalProcessed: 0,
        totalWaitTime: 0,
        maxQueueLength: 0,
        busyTime: 0,
        recentPassages: [],
      });
    }

    this.initialized = true;
  }

  /**
   * Resets all runtime state (queues, occupancy, timers) while preserving configurations
   */
  public static reset(): void {
    this.init(true);
  }

  /**
   * Advances telemetry metrics, tracks busy times, and trims recent throughput windows
   */
  public static step(dt: number, elapsedTime: number): void {
    this.init();

    // Update Doors
    for (const door of this.doors.values()) {
      if (door.waitingQueue.length > 0) {
        door.busyTime += dt;
        door.totalWaitTime += door.waitingQueue.length * dt;
        door.maxQueueLength = Math.max(door.maxQueueLength, door.waitingQueue.length);
      }
      // Trim recent passages older than 3 seconds
      door.recentPassages = door.recentPassages.filter((t) => elapsedTime - t <= 3.0);
    }

    // Update Staircases
    for (const stair of this.stairs.values()) {
      let totalQueued = 0;
      for (const queue of stair.landingQueues.values()) {
        totalQueued += queue.length;
      }
      if (stair.currentOccupants.size > 0 || totalQueued > 0) {
        stair.busyTime += dt;
        stair.totalWaitTime += totalQueued * dt;
        stair.maxQueueLength = Math.max(stair.maxQueueLength, totalQueued);
      }
      stair.recentPassages = stair.recentPassages.filter((t) => elapsedTime - t <= 3.0);
    }

    // Update Exits
    for (const exit of this.exits.values()) {
      if (exit.dischargeQueue.length > 0) {
        exit.busyTime += dt;
        exit.totalWaitTime += exit.dischargeQueue.length * dt;
        exit.maxQueueLength = Math.max(exit.maxQueueLength, exit.dischargeQueue.length);
      }
      exit.recentPassages = exit.recentPassages.filter((t) => elapsedTime - t <= 3.0);
    }
  }

  // =========================================================================
  // DOOR CAPACITY & FLOW CONTROL
  // =========================================================================

  /**
   * Requests clearance for an agent to pass through a door.
   * Enforces flowRatePersonsPerSecond and maintains deterministic arrival queues.
   */
  public static requestDoorPassage(
    doorId: string,
    agentId: string,
    simTime: number,
    approachDistance: number,
    dt: number
  ): { permitted: boolean; queuePosition: number; waitTimeAdded: number } {
    this.init();
    const door = this.doors.get(doorId);
    if (!door || !door.config.enabled) {
      return { permitted: false, queuePosition: 0, waitTimeAdded: dt };
    }

    const minInterval = 1.0 / door.config.flowRatePersonsPerSecond;
    const existingIndex = door.waitingQueue.findIndex((q) => q.agentId === agentId);

    if (existingIndex === -1) {
      // Agent newly arriving at the door threshold
      const timeSinceLast = simTime - door.lastPassageTime;
      // If queue is empty and flow interval satisfied, allow immediate passage
      if (door.waitingQueue.length === 0 && timeSinceLast >= minInterval - 0.001) {
        door.lastPassageTime = simTime;
        door.totalProcessed++;
        door.recentPassages.push(simTime);
        return { permitted: true, queuePosition: 0, waitTimeAdded: 0 };
      }

      // Saturated door: agent joins the deterministic queue
      door.waitingQueue.push({
        agentId,
        arrivalTime: simTime,
        approachDistance,
      });

      // Deterministic sort: arrival time, then agent ID tie-breaker
      door.waitingQueue.sort((a, b) => {
        if (Math.abs(a.arrivalTime - b.arrivalTime) > 0.001) {
          return a.arrivalTime - b.arrivalTime;
        }
        return a.agentId.localeCompare(b.agentId);
      });

      door.maxQueueLength = Math.max(door.maxQueueLength, door.waitingQueue.length);
      const queuePos = door.waitingQueue.findIndex((q) => q.agentId === agentId);
      return { permitted: false, queuePosition: queuePos, waitTimeAdded: dt };
    }

    // Agent is already in the waiting queue
    if (existingIndex === 0) {
      // Agent is head of the queue! Check if flow rate interval has elapsed
      const timeSinceLast = simTime - door.lastPassageTime;
      if (timeSinceLast >= minInterval - 0.001) {
        door.waitingQueue.shift();
        door.lastPassageTime = simTime;
        door.totalProcessed++;
        door.recentPassages.push(simTime);
        return { permitted: true, queuePosition: 0, waitTimeAdded: 0 };
      }
    }

    return { permitted: false, queuePosition: existingIndex, waitTimeAdded: dt };
  }

  // =========================================================================
  // EMERGENCY STAIRCASE CAPACITY & MULTI-FLOOR FLOW CONTROL
  // =========================================================================

  /**
   * Requests clearance for an agent to enter an emergency staircase from a floor landing.
   * Enforces maxSimultaneousOccupants and landing entry flow rates.
   */
  public static requestStairEntry(
    stairId: string,
    landingNodeId: string,
    agentId: string,
    simTime: number,
    dt: number
  ): { permitted: boolean; queuePosition: number; waitTimeAdded: number } {
    this.init();
    const stair = this.stairs.get(stairId);
    if (!stair || !stair.config.enabled) {
      return { permitted: false, queuePosition: 0, waitTimeAdded: dt };
    }

    // If agent is already registered inside this staircase, keep permitted
    if (stair.currentOccupants.has(agentId)) {
      return { permitted: true, queuePosition: 0, waitTimeAdded: 0 };
    }

    let queue = stair.landingQueues.get(landingNodeId);
    if (!queue) {
      queue = [];
      stair.landingQueues.set(landingNodeId, queue);
    }

    const lastEntryTime = stair.lastEntryTimePerLanding.get(landingNodeId) ?? -999;
    const minInterval = 1.0 / stair.config.flowRatePersonsPerSecond;
    const existingIndex = queue.findIndex((q) => q.agentId === agentId);

    // Check capacity: must be below maxSimultaneousOccupants
    const hasCapacity = stair.currentOccupants.size < stair.config.maxSimultaneousOccupants;

    if (existingIndex === -1) {
      // Newly arriving at landing
      const timeSinceLast = simTime - lastEntryTime;
      if (queue.length === 0 && hasCapacity && timeSinceLast >= minInterval - 0.001) {
        stair.currentOccupants.add(agentId);
        stair.lastEntryTimePerLanding.set(landingNodeId, simTime);
        stair.totalProcessed++;
        stair.recentPassages.push(simTime);
        return { permitted: true, queuePosition: 0, waitTimeAdded: 0 };
      }

      // Join landing queue
      queue.push({ agentId, arrivalTime: simTime, approachDistance: 0 });
      queue.sort((a, b) => {
        if (Math.abs(a.arrivalTime - b.arrivalTime) > 0.001) {
          return a.arrivalTime - b.arrivalTime;
        }
        return a.agentId.localeCompare(b.agentId);
      });

      const totalQueued = Array.from(stair.landingQueues.values()).reduce(
        (sum, q) => sum + q.length,
        0
      );
      stair.maxQueueLength = Math.max(stair.maxQueueLength, totalQueued);

      const queuePos = queue.findIndex((q) => q.agentId === agentId);
      return { permitted: false, queuePosition: queuePos, waitTimeAdded: dt };
    }

    // Already in landing queue: check if agent is head of queue and can enter
    if (existingIndex === 0 && hasCapacity) {
      // Multi-floor fairness: check if another landing has an earlier waiting occupant
      let hasEarlierAcrossFloors = false;
      const myArrival = queue[0].arrivalTime;
      for (const [otherLandingId, otherQueue] of stair.landingQueues.entries()) {
        if (otherLandingId !== landingNodeId && otherQueue.length > 0) {
          if (otherQueue[0].arrivalTime < myArrival - 0.05) {
            hasEarlierAcrossFloors = true;
            break;
          }
        }
      }

      const timeSinceLast = simTime - lastEntryTime;
      if (!hasEarlierAcrossFloors && timeSinceLast >= minInterval - 0.001) {
        queue.shift();
        stair.currentOccupants.add(agentId);
        stair.lastEntryTimePerLanding.set(landingNodeId, simTime);
        stair.totalProcessed++;
        stair.recentPassages.push(simTime);
        return { permitted: true, queuePosition: 0, waitTimeAdded: 0 };
      }
    }

    return { permitted: false, queuePosition: existingIndex, waitTimeAdded: dt };
  }

  /**
   * Releases an occupant from the staircase when they reach the ground landing
   */
  public static leaveStaircase(stairId: string, agentId: string): void {
    const stair = this.stairs.get(stairId);
    if (stair && stair.currentOccupants.has(agentId)) {
      stair.currentOccupants.delete(agentId);
    }
  }

  /**
   * Checks if an agent is currently inside a staircase
   */
  public static isAgentInsideStaircase(stairId: string, agentId: string): boolean {
    const stair = this.stairs.get(stairId);
    return stair ? stair.currentOccupants.has(agentId) : false;
  }

  // =========================================================================
  // GROUND EXIT DISCHARGE FLOW CONTROL
  // =========================================================================

  /**
   * Processes an agent reaching a ground floor discharge exit.
   * Agents form an exit discharge queue and are released at the exit's finite discharge rate.
   */
  public static processExitDischarge(
    exitId: string,
    agentId: string,
    simTime: number,
    dt: number
  ): { evacuated: boolean; queuePosition: number; waitTimeAdded: number } {
    this.init();
    const exit = this.exits.get(exitId);
    if (!exit || !exit.config.enabled) {
      return { evacuated: false, queuePosition: 0, waitTimeAdded: dt };
    }

    const minInterval = 1.0 / exit.config.flowRatePersonsPerSecond;
    const existingIndex = exit.dischargeQueue.findIndex((q) => q.agentId === agentId);

    if (existingIndex === -1) {
      // Newly arriving at discharge exit
      const timeSinceLast = simTime - exit.lastDischargeTime;
      if (exit.dischargeQueue.length === 0 && timeSinceLast >= minInterval - 0.001) {
        exit.lastDischargeTime = simTime;
        exit.totalProcessed++;
        exit.recentPassages.push(simTime);
        return { evacuated: true, queuePosition: 0, waitTimeAdded: 0 };
      }

      // Join exit discharge queue
      exit.dischargeQueue.push({
        agentId,
        arrivalTime: simTime,
        approachDistance: 0,
      });

      exit.dischargeQueue.sort((a, b) => {
        if (Math.abs(a.arrivalTime - b.arrivalTime) > 0.001) {
          return a.arrivalTime - b.arrivalTime;
        }
        return a.agentId.localeCompare(b.agentId);
      });

      exit.maxQueueLength = Math.max(exit.maxQueueLength, exit.dischargeQueue.length);
      const queuePos = exit.dischargeQueue.findIndex((q) => q.agentId === agentId);
      return { evacuated: false, queuePosition: queuePos, waitTimeAdded: dt };
    }

    // In exit queue
    if (existingIndex === 0) {
      const timeSinceLast = simTime - exit.lastDischargeTime;
      if (timeSinceLast >= minInterval - 0.001) {
        exit.dischargeQueue.shift();
        exit.lastDischargeTime = simTime;
        exit.totalProcessed++;
        exit.recentPassages.push(simTime);
        return { evacuated: true, queuePosition: 0, waitTimeAdded: 0 };
      }
    }

    return { evacuated: false, queuePosition: existingIndex, waitTimeAdded: dt };
  }

  // =========================================================================
  // METRICS & INSPECTION TELEMETRY
  // =========================================================================

  /**
   * Retrieves live metrics for a specific infrastructure entity (door, stair, or exit)
   */
  public static getMetrics(id: string, elapsedTime = 1.0): CapacityInfrastructureMetrics | null {
    this.init();

    // Check Doors
    const door = this.doors.get(id);
    if (door) {
      const qLen = door.waitingQueue.length;
      let state: InfrastructureState = 'AVAILABLE';
      if (!door.config.enabled) state = 'BLOCKED';
      else if (qLen >= 5) state = 'CONGESTED';
      else if (qLen > 0) state = 'BUSY';

      const throughput =
        door.recentPassages.length > 0
          ? Number((door.recentPassages.length / 3.0).toFixed(2))
          : 0;
      const utilization = Number(
        Math.min(1.0, door.busyTime / Math.max(0.1, elapsedTime)).toFixed(3)
      );

      return {
        id: door.config.id,
        name: door.config.name,
        type: 'door',
        floor: door.config.floor,
        state,
        currentOccupancy: qLen > 0 ? 1 : 0,
        flowRate: door.config.flowRatePersonsPerSecond,
        currentThroughput: throughput,
        totalProcessed: door.totalProcessed,
        currentQueueLength: qLen,
        maxQueueLength: door.maxQueueLength,
        totalWaitTime: Number(door.totalWaitTime.toFixed(1)),
        utilization,
        queuedAgentIds: door.waitingQueue.map((q) => q.agentId),
      };
    }

    // Check Staircases
    const stair = this.stairs.get(id);
    if (stair) {
      const occ = stair.currentOccupants.size;
      let totalQueued = 0;
      const queuedAgentIds: string[] = [];
      for (const q of stair.landingQueues.values()) {
        totalQueued += q.length;
        for (const item of q) queuedAgentIds.push(item.agentId);
      }

      let state: InfrastructureState = 'AVAILABLE';
      if (!stair.config.enabled) state = 'BLOCKED';
      else if (occ >= stair.config.maxSimultaneousOccupants) state = 'FULL';
      else if (totalQueued >= 5 || occ >= stair.config.maxSimultaneousOccupants * 0.8)
        state = 'CONGESTED';
      else if (occ > 0 || totalQueued > 0) state = 'BUSY';

      const throughput =
        stair.recentPassages.length > 0
          ? Number((stair.recentPassages.length / 3.0).toFixed(2))
          : 0;
      const utilization = Number(
        Math.min(
          1.0,
          Math.max(
            stair.busyTime / Math.max(0.1, elapsedTime),
            occ / stair.config.maxSimultaneousOccupants
          )
        ).toFixed(3)
      );

      return {
        id: stair.config.id,
        name: stair.config.name,
        type: 'staircase',
        floor: 1,
        state,
        currentOccupancy: occ,
        maxOccupancy: stair.config.maxSimultaneousOccupants,
        flowRate: stair.config.flowRatePersonsPerSecond,
        currentThroughput: throughput,
        totalProcessed: stair.totalProcessed,
        currentQueueLength: totalQueued,
        maxQueueLength: stair.maxQueueLength,
        totalWaitTime: Number(stair.totalWaitTime.toFixed(1)),
        utilization,
        queuedAgentIds,
      };
    }

    // Check Exits
    const exit = this.exits.get(id);
    if (exit) {
      const qLen = exit.dischargeQueue.length;
      let state: InfrastructureState = 'AVAILABLE';
      if (!exit.config.enabled) state = 'BLOCKED';
      else if (qLen >= 8) state = 'CONGESTED';
      else if (qLen > 0) state = 'BUSY';

      const throughput =
        exit.recentPassages.length > 0
          ? Number((exit.recentPassages.length / 3.0).toFixed(2))
          : 0;
      const utilization = Number(
        Math.min(1.0, exit.busyTime / Math.max(0.1, elapsedTime)).toFixed(3)
      );

      return {
        id: exit.config.id,
        name: exit.config.name,
        type: 'exit',
        floor: 1,
        state,
        currentOccupancy: qLen,
        flowRate: exit.config.flowRatePersonsPerSecond,
        currentThroughput: throughput,
        totalProcessed: exit.totalProcessed,
        currentQueueLength: qLen,
        maxQueueLength: exit.maxQueueLength,
        totalWaitTime: Number(exit.totalWaitTime.toFixed(1)),
        utilization,
        queuedAgentIds: exit.dischargeQueue.map((q) => q.agentId),
      };
    }

    return null;
  }

  /**
   * Generates a global summary of capacity utilization, maximum bottlenecks, and wait times
   */
  public static getSummary(elapsedTime = 1.0): SimulationCapacitySummary {
    this.init();

    let totalWait = 0;
    let maxDoor = { id: '', name: '', length: 0 };
    let maxStair = { id: '', name: '', length: 0 };
    let maxExit = { id: '', name: '', length: 0 };
    let doorUtilSum = 0;
    let stairUtilSum = 0;
    let exitUtilSum = 0;

    for (const d of this.doors.values()) {
      totalWait += d.totalWaitTime;
      const m = this.getMetrics(d.config.id, elapsedTime);
      if (m) {
        doorUtilSum += m.utilization;
        if (d.maxQueueLength > maxDoor.length) {
          maxDoor = { id: d.config.id, name: d.config.name, length: d.maxQueueLength };
        }
      }
    }

    for (const s of this.stairs.values()) {
      totalWait += s.totalWaitTime;
      const m = this.getMetrics(s.config.id, elapsedTime);
      if (m) {
        stairUtilSum += m.utilization;
        if (s.maxQueueLength > maxStair.length) {
          maxStair = { id: s.config.id, name: s.config.name, length: s.maxQueueLength };
        }
      }
    }

    for (const e of this.exits.values()) {
      totalWait += e.totalWaitTime;
      const m = this.getMetrics(e.config.id, elapsedTime);
      if (m) {
        exitUtilSum += m.utilization;
        if (e.maxQueueLength > maxExit.length) {
          maxExit = { id: e.config.id, name: e.config.name, length: e.maxQueueLength };
        }
      }
    }

    return {
      totalQueueWaitingTime: Number(totalWait.toFixed(1)),
      maxDoorQueue: maxDoor,
      maxStaircaseQueue: maxStair,
      maxExitQueue: maxExit,
      averageDoorUtilization: Number((doorUtilSum / Math.max(1, this.doors.size)).toFixed(3)),
      averageStaircaseUtilization: Number(
        (stairUtilSum / Math.max(1, this.stairs.size)).toFixed(3)
      ),
      averageExitUtilization: Number((exitUtilSum / Math.max(1, this.exits.size)).toFixed(3)),
    };
  }

  // Configuration Mutators
  public static setDoorFlowRate(doorId: string, flowRate: number): void {
    const door = this.doors.get(doorId);
    if (door) door.config.flowRatePersonsPerSecond = flowRate;
  }

  public static setStairMaxOccupancy(stairId: string, maxOccupancy: number): void {
    const stair = this.stairs.get(stairId);
    if (stair) stair.config.maxSimultaneousOccupants = maxOccupancy;
  }

  public static setStairFlowRate(stairId: string, flowRate: number): void {
    const stair = this.stairs.get(stairId);
    if (stair) stair.config.flowRatePersonsPerSecond = flowRate;
  }

  public static setExitFlowRate(exitId: string, flowRate: number): void {
    const exit = this.exits.get(exitId);
    if (exit) exit.config.flowRatePersonsPerSecond = flowRate;
  }
}
