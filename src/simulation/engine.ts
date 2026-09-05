/**
 * Simulation Engine for Physical Agent Egress Dynamics (Phase B: Infrastructure Capacity)
 * Executes continuous, deterministic kinematic progression along graph trajectories
 * with fixed timestep updates, personal-space maintenance, and strict infrastructure
 * capacity constraints on Doors, Emergency Staircases, and Ground Discharge Exits.
 */

import { EvacuationGraph } from '../graph/types';
import { FloorId } from '../types/building';
import { CapacityEngine } from './capacityEngine';
import {
  DEFAULT_PERSONAL_SPACE_RADIUS,
  MIN_FOLLOW_DISTANCE,
  STAIRCASE_SPEED_FACTOR,
  STOP_FOLLOW_DISTANCE,
} from './constants';
import { AgentGenerator } from './generator';
import { AgentStatus, SimulatedAgent, SimulationMetrics } from './types';

interface AgentSnapshot {
  id: string;
  floor: FloorId;
  x: number;
  y: number;
  z: number;
  status: AgentStatus;
  speed: number;
  walkingSpeed: number;
  radius: number;
}

export class SimulationEngine {
  /**
   * Generates a fresh set of agents using deterministic seed and initializes capacity engine
   */
  public static initPopulation(
    graph: EvacuationGraph,
    count = 150,
    seed = 42
  ): SimulatedAgent[] {
    CapacityEngine.init(true);
    return AgentGenerator.generateFleet(graph, count, seed);
  }

  /**
   * Resets all agents to their initial spawn positions and idle states, and resets capacity queues
   */
  public static resetAgents(agents: SimulatedAgent[]): SimulatedAgent[] {
    CapacityEngine.reset();
    return agents.map((agent) => ({
      ...agent,
      status: 'idle',
      currentFloor: agent.spawnFloor,
      position: { ...agent.spawnPosition },
      currentNodeId: `NODE_${agent.spawnRoomId}`,
      destination: agent.targetExitId,
      currentWaypointIndex: 1,
      currentSpeed: agent.walkingSpeed,
      reactionRemaining: agent.reactionTime,
      distanceTraveled: 0,
      queueWaitTime: 0,
      isBlockedOrQueued: false,
      hazardExposure: 0,
      riskScore: 0,
      currentCongestionState: 'LOW',
      currentQueueId: undefined,
      queueStartTime: undefined,
      currentInfrastructureId: undefined,
      evacuationTime: undefined,
    }));
  }

  /**
   * Advances the simulation by dt seconds with physically grounded kinematics (no teleportation)
   * Integrates Door throughput limits, Staircase occupant capacity, and Exit discharge rates.
   */
  public static step(
    agents: SimulatedAgent[],
    dt: number,
    elapsedTime: number
  ): { updatedAgents: SimulatedAgent[]; newElapsedTime: number; metrics: SimulationMetrics } {
    const newElapsedTime = Number((elapsedTime + dt).toFixed(2));
    let totalEvacuatedTime = 0;
    let evacuatedCount = 0;
    let reactingCount = 0;
    let queuedCount = 0;

    // Advance capacity metrics and utilization windows
    CapacityEngine.step(dt, newElapsedTime);

    // Double-buffered read snapshot: agents query positions at start of timestep
    const currentSnapshot: AgentSnapshot[] = agents.map((a) => ({
      id: a.id,
      floor: a.currentFloor,
      x: a.position.x,
      y: a.position.y,
      z: a.position.z,
      status: a.status,
      speed: a.currentSpeed,
      walkingSpeed: a.walkingSpeed,
      radius: a.personalSpaceRadius || DEFAULT_PERSONAL_SPACE_RADIUS,
    }));

    const updatedAgents: SimulatedAgent[] = agents.map((agent): SimulatedAgent => {
      // 1. Evacuated agents remain safely outside
      if (agent.status === 'evacuated') {
        evacuatedCount++;
        totalEvacuatedTime += agent.evacuationTime || 0;
        return agent;
      }

      // 2. Idle agents transition to reacting upon alarm activation
      let status: AgentStatus = agent.status;
      let reactionRemaining = agent.reactionRemaining;

      if (status === 'idle') {
        status = 'reacting';
      }

      if (status === 'reacting') {
        reactionRemaining -= dt;
        if (reactionRemaining <= 0) {
          status = 'evacuating';
          reactionRemaining = 0;
        } else {
          reactingCount++;
          return {
            ...agent,
            status,
            reactionRemaining: Number(reactionRemaining.toFixed(2)),
          };
        }
      }

      // 3. Evacuating / Queued agents: evaluate infrastructure capacity & kinematic movement
      if (status === 'evacuating' || status === 'queued') {
        let {
          currentWaypointIndex,
          position,
          currentFloor,
          distanceTraveled,
          queueWaitTime,
        } = agent;
        const waypoints = agent.routeWaypoints;
        const route = agent.currentRoute;

        const isLastWaypoint = currentWaypointIndex >= waypoints.length - 1;
        const targetWp = isLastWaypoint
          ? waypoints[waypoints.length - 1]
          : waypoints[currentWaypointIndex];
        const targetNodeId = isLastWaypoint
          ? route[route.length - 1] || agent.targetExitId
          : route[currentWaypointIndex] || '';

        const dx = targetWp.x - position.x;
        const dy = targetWp.y - position.y;
        const dz = targetWp.z - position.z;
        const dist = Math.hypot(dx, dy, dz);

        // =====================================================================
        // CHECKPOINT A: GROUND FLOOR DISCHARGE EXIT CAPACITY
        // =====================================================================
        const isAtExitThreshold =
          (isLastWaypoint && dist <= 1.2) ||
          (targetNodeId.includes('EXIT') && dist <= 1.2) ||
          currentWaypointIndex >= waypoints.length;

        if (isAtExitThreshold) {
          const exitId = targetNodeId.includes('EXIT')
            ? targetNodeId.replace('NODE_', '')
            : agent.targetExitId.replace('NODE_', '');

          const dischargeResult = CapacityEngine.processExitDischarge(
            exitId,
            agent.id,
            newElapsedTime,
            dt
          );

          if (dischargeResult.evacuated) {
            // Agent has passed through the rate-limited exit discharge process!
            evacuatedCount++;
            const evacTime = newElapsedTime;
            totalEvacuatedTime += evacTime;

            // Release from staircase if previously registered
            if (agent.currentInfrastructureId?.includes('STAIR')) {
              CapacityEngine.leaveStaircase(agent.currentInfrastructureId, agent.id);
            }

            return {
              ...agent,
              status: 'evacuated',
              currentFloor: 1,
              position: { ...targetWp },
              currentNodeId: agent.targetExitId,
              currentWaypointIndex: waypoints.length,
              currentSpeed: 0,
              isBlockedOrQueued: false,
              currentQueueId: undefined,
              currentInfrastructureId: undefined,
              distanceTraveled: Number(distanceTraveled.toFixed(2)),
              queueWaitTime: Number(queueWaitTime.toFixed(2)),
              evacuationTime: evacTime,
            };
          } else {
            // Agent is waiting in the exit discharge queue
            queuedCount++;
            const qPos = dischargeResult.queuePosition;
            // Align agent in physical exit queue along approach vector
            const prevWp =
              waypoints[waypoints.length - 2] || { x: targetWp.x, y: targetWp.y, z: targetWp.z + 1.5 };
            const appX = targetWp.x - prevWp.x;
            const appZ = targetWp.z - prevWp.z;
            const appLen = Math.hypot(appX, appZ) || 1;
            const ndx = appX / appLen;
            const ndz = appZ / appLen;

            const qOffset = 0.35 + qPos * 0.55;
            const queuePosX = targetWp.x - ndx * qOffset;
            const queuePosZ = targetWp.z - ndz * qOffset;

            // Smooth interpolation to queue slot to prevent snapping
            const interpX = position.x + (queuePosX - position.x) * 0.25;
            const interpZ = position.z + (queuePosZ - position.z) * 0.25;

            return {
              ...agent,
              status: 'queued',
              position: {
                x: Number(interpX.toFixed(3)),
                y: targetWp.y,
                z: Number(interpZ.toFixed(3)),
              },
              currentFloor: 1,
              currentSpeed: 0,
              isBlockedOrQueued: true,
              currentQueueId: exitId,
              currentInfrastructureId: exitId,
              queueWaitTime: Number((queueWaitTime + dischargeResult.waitTimeAdded).toFixed(2)),
              currentCongestionState: qPos >= 8 ? 'CRITICAL' : qPos >= 4 ? 'HIGH' : 'MEDIUM',
            };
          }
        }

        // =====================================================================
        // CHECKPOINT B: DOOR THROUGHPUT CAPACITY & QUEUEING
        // =====================================================================
        if (targetNodeId.includes('_DOOR_')) {
          const doorId = targetNodeId.replace('NODE_', '');
          const distToDoor = Math.hypot(dx, dz);

          if (distToDoor <= 1.25) {
            const passage = CapacityEngine.requestDoorPassage(
              doorId,
              agent.id,
              newElapsedTime,
              distToDoor,
              dt
            );

            if (!passage.permitted) {
              // Saturated door: agent queues physically in front of the door
              queuedCount++;
              const qPos = passage.queuePosition;
              const dirXZ = Math.hypot(dx, dz) || 1;
              const ndx = dx / dirXZ;
              const ndz = dz / dirXZ;

              const qOffset = 0.35 + qPos * 0.55;
              const qTargetX = targetWp.x - ndx * qOffset;
              const qTargetZ = targetWp.z - ndz * qOffset;

              const interpX = position.x + (qTargetX - position.x) * 0.25;
              const interpZ = position.z + (qTargetZ - position.z) * 0.25;

              return {
                ...agent,
                status: 'queued',
                position: {
                  x: Number(interpX.toFixed(3)),
                  y: targetWp.y,
                  z: Number(interpZ.toFixed(3)),
                },
                currentSpeed: 0,
                isBlockedOrQueued: true,
                currentQueueId: doorId,
                currentInfrastructureId: doorId,
                queueWaitTime: Number((queueWaitTime + passage.waitTimeAdded).toFixed(2)),
                currentCongestionState: qPos >= 5 ? 'CRITICAL' : qPos >= 3 ? 'HIGH' : 'MEDIUM',
              };
            }
          }
        }

        // =====================================================================
        // CHECKPOINT C: EMERGENCY STAIRCASS CAPACITY & MULTI-FLOOR ENTRY
        // =====================================================================
        if (targetNodeId.includes('_LANDING_')) {
          const stairId = targetNodeId.includes('WEST') ? 'STAIR_WEST' : 'STAIR_EAST';
          const landingFloor = Math.max(1, Math.min(5, Math.round(targetWp.y / 4.0) + 1));
          const distToLanding = Math.hypot(dx, dz);

          // Entering staircase from upper floor (F2 - F5)
          if (landingFloor > 1 && distToLanding <= 1.25) {
            const stairEntry = CapacityEngine.requestStairEntry(
              stairId,
              targetNodeId,
              agent.id,
              newElapsedTime,
              dt
            );

            if (!stairEntry.permitted) {
              // Staircase is full or rate-limited: queue outside landing door
              queuedCount++;
              const qPos = stairEntry.queuePosition;
              const dirXZ = Math.hypot(dx, dz) || 1;
              const ndx = dx / dirXZ;
              const ndz = dz / dirXZ;

              const qOffset = 0.35 + qPos * 0.55;
              const qTargetX = targetWp.x - ndx * qOffset;
              const qTargetZ = targetWp.z - ndz * qOffset;

              const interpX = position.x + (qTargetX - position.x) * 0.25;
              const interpZ = position.z + (qTargetZ - position.z) * 0.25;

              return {
                ...agent,
                status: 'queued',
                position: {
                  x: Number(interpX.toFixed(3)),
                  y: targetWp.y,
                  z: Number(interpZ.toFixed(3)),
                },
                currentSpeed: 0,
                isBlockedOrQueued: true,
                currentQueueId: stairId,
                currentInfrastructureId: stairId,
                queueWaitTime: Number((queueWaitTime + stairEntry.waitTimeAdded).toFixed(2)),
                currentCongestionState: qPos >= 4 ? 'CRITICAL' : 'HIGH',
              };
            }
          }

          // Arrived on Ground Floor Landing (F1): discharge from staircase to free capacity for upper floors
          if (landingFloor === 1 && distToLanding <= 0.5) {
            CapacityEngine.leaveStaircase(stairId, agent.id);
          }
        }

        // =====================================================================
        // CHECKPOINT D: CONTINUOUS KINEMATICS & PERSONAL-SPACE FOLLOWING
        // =====================================================================
        const isStairs = Math.abs(dy) > 0.35;
        const baseSpeed = isStairs
          ? agent.walkingSpeed * STAIRCASE_SPEED_FACTOR
          : agent.walkingSpeed;

        const distXZ = Math.hypot(dx, dz);
        const dirX = distXZ > 0.001 ? dx / distXZ : 0;
        const dirZ = distXZ > 0.001 ? dz / distXZ : 0;

        let effectiveSpeed = baseSpeed;
        let isBlocked = false;
        let lateralNudgeX = 0;
        let lateralNudgeZ = 0;

        // Proximity checks with other agents on same floor and elevation band
        for (const other of currentSnapshot) {
          if (other.id === agent.id) continue;
          if (other.floor !== currentFloor) continue;
          if (other.status === 'evacuated') continue;

          const ox = other.x - position.x;
          const oy = other.y - position.y;
          const oz = other.z - position.z;

          if (Math.abs(oy) > 1.2) continue;

          const sepDist = Math.hypot(ox, oz);

          // Anti-stacking nudge
          if (sepDist < 0.16) {
            const perpX = -dirZ;
            const perpZ = dirX;
            const sign = agent.id < other.id ? 1 : -1;
            lateralNudgeX += perpX * 0.03 * sign;
            lateralNudgeZ += perpZ * 0.03 * sign;
          }

          const forwardProj = ox * dirX + oz * dirZ;
          const lateralDev = Math.abs(ox * (-dirZ) + oz * dirX);

          const combinedRadius =
            (agent.personalSpaceRadius || DEFAULT_PERSONAL_SPACE_RADIUS) + other.radius;
          const stopDist = Math.max(STOP_FOLLOW_DISTANCE, combinedRadius * 0.65);
          const slowDist = Math.max(MIN_FOLLOW_DISTANCE, combinedRadius * 1.15);

          if (forwardProj > 0 && forwardProj < slowDist && lateralDev < 0.55) {
            if (forwardProj <= stopDist) {
              effectiveSpeed = 0;
              isBlocked = true;
              break;
            } else {
              isBlocked = true;
              const decelRatio = (forwardProj - stopDist) / (slowDist - stopDist);
              const clampedRatio = Math.max(0.1, Math.min(1.0, decelRatio));
              const leadSpeed = other.speed > 0 ? other.speed : other.walkingSpeed * 0.5;
              const throttledSpeed = Math.min(baseSpeed * clampedRatio, leadSpeed);
              if (throttledSpeed < effectiveSpeed) {
                effectiveSpeed = throttledSpeed;
              }
            }
          }
        }

        let newStatus: AgentStatus = 'evacuating';
        if (effectiveSpeed <= 0.01) {
          newStatus = 'queued';
          isBlocked = true;
          queueWaitTime += dt;
          queuedCount++;
        } else if (isBlocked) {
          queueWaitTime += dt * 0.4;
          queuedCount++;
        }

        const moveDist = effectiveSpeed * dt;

        if (moveDist >= dist || dist < 0.04) {
          // Reached current waypoint
          position = {
            x: Number((targetWp.x + lateralNudgeX).toFixed(3)),
            y: targetWp.y,
            z: Number((targetWp.z + lateralNudgeZ).toFixed(3)),
          };
          distanceTraveled += dist;
          currentWaypointIndex++;

          const calculatedFloor = Math.max(
            1,
            Math.min(5, Math.round(position.y / 4.0) + 1)
          ) as FloorId;
          currentFloor = calculatedFloor;

          const reachedNodeId = route[currentWaypointIndex] || agent.currentNodeId;

          return {
            ...agent,
            status: newStatus,
            position,
            currentFloor,
            currentNodeId: reachedNodeId,
            currentWaypointIndex,
            currentSpeed: Number(effectiveSpeed.toFixed(2)),
            distanceTraveled: Number(distanceTraveled.toFixed(2)),
            queueWaitTime: Number(queueWaitTime.toFixed(2)),
            isBlockedOrQueued: isBlocked,
            currentQueueId: undefined,
          };
        } else {
          // Continuous interpolation along line segment
          const ratio = moveDist / dist;
          const newX = position.x + dx * ratio + lateralNudgeX;
          const newY = position.y + dy * ratio;
          const newZ = position.z + dz * ratio + lateralNudgeZ;

          const calculatedFloor = Math.max(
            1,
            Math.min(5, Math.round(newY / 4.0) + 1)
          ) as FloorId;

          return {
            ...agent,
            status: newStatus,
            position: {
              x: Number(newX.toFixed(3)),
              y: Number(newY.toFixed(3)),
              z: Number(newZ.toFixed(3)),
            },
            currentFloor: calculatedFloor,
            currentSpeed: Number(effectiveSpeed.toFixed(2)),
            distanceTraveled: Number((distanceTraveled + moveDist).toFixed(2)),
            queueWaitTime: Number(queueWaitTime.toFixed(2)),
            isBlockedOrQueued: isBlocked,
          };
        }
      }

      return agent;
    });

    const totalAgents = agents.length;
    const remainingAgents = totalAgents - evacuatedCount;
    const averageEvacuationTime =
      evacuatedCount > 0 ? Number((totalEvacuatedTime / evacuatedCount).toFixed(1)) : 0;
    const evacuationProgress = Number(((evacuatedCount / totalAgents) * 100).toFixed(1));

    const metrics: SimulationMetrics = {
      totalAgents,
      evacuatedAgents: evacuatedCount,
      remainingAgents,
      reactingAgents: reactingCount,
      queuedAgents: queuedCount,
      elapsedTime: newElapsedTime,
      averageEvacuationTime,
      evacuationProgress,
    };

    return { updatedAgents, newElapsedTime, metrics };
  }
}
