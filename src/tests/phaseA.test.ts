/**
 * Phase A Acceptance & Verification Test Suite
 * Validates deterministic agent generation, fixed-timestep kinematic progression,
 * personal-space separation, follower deceleration, and no-teleportation constraints.
 */

import { buildingRegistry } from '../data/buildingRegistry';
import { GraphBuilder } from '../graph/builder';
import { FIXED_TIMESTEP, STOP_FOLLOW_DISTANCE, MIN_FOLLOW_DISTANCE } from '../simulation/constants';
import { SimulationEngine } from '../simulation/engine';
import { SimulatedAgent } from '../simulation/types';
import { CapacityEngine } from '../simulation/capacityEngine';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runPhaseATests() {
  console.log('🧪 ========================================================');
  console.log('🧪 RUNNING PHASE A VERIFICATION & ACCEPTANCE TEST SUITE');
  console.log('🧪 ========================================================\n');

  const graph = GraphBuilder.buildGraph(buildingRegistry);

  // -------------------------------------------------------------
  // TEST 1: Deterministic Initialization with Same Seed (150 Agents)
  // -------------------------------------------------------------
  console.log('▶ Test 1: Deterministic Agent Fleet Generation (Seed 42 x2)');
  const fleetA = SimulationEngine.initPopulation(graph, 150, 42);
  const fleetB = SimulationEngine.initPopulation(graph, 150, 42);

  assert(fleetA.length === 150, 'Fleet A must have 150 agents');
  assert(fleetB.length === 150, 'Fleet B must have 150 agents');

  for (let i = 0; i < 150; i++) {
    const a = fleetA[i];
    const b = fleetB[i];

    assert(a.id === b.id, `Agent ${i} ID mismatch: ${a.id} vs ${b.id}`);
    assert(a.profile === b.profile, `Agent ${a.id} profile mismatch`);
    assert(a.mobilityType === b.mobilityType, `Agent ${a.id} mobilityType mismatch`);
    assert(a.walkingSpeed === b.walkingSpeed, `Agent ${a.id} walkingSpeed mismatch`);
    assert(a.reactionTime === b.reactionTime, `Agent ${a.id} reactionTime mismatch`);
    assert(a.targetExitId === b.targetExitId, `Agent ${a.id} targetExitId mismatch`);
    assert(a.destination === b.destination, `Agent ${a.id} destination mismatch`);
    assert(a.position.x === b.position.x, `Agent ${a.id} spawn X mismatch`);
    assert(a.position.y === b.position.y, `Agent ${a.id} spawn Y mismatch`);
    assert(a.position.z === b.position.z, `Agent ${a.id} spawn Z mismatch`);
    assert(a.currentRoute.length === b.currentRoute.length, `Agent ${a.id} route length mismatch`);
    assert(a.routeWaypoints.length === b.routeWaypoints.length, `Agent ${a.id} waypoints mismatch`);
  }
  console.log('  ✅ PASSED: 150 agents generated identically across two independent runs with seed 42.\n');

  // -------------------------------------------------------------
  // TEST 2: Complete SimulatedAgent State Presence
  // -------------------------------------------------------------
  console.log('▶ Test 2: Complete SimulatedAgent State Properties');
  const sampleAgent = fleetA[0];
  assert(typeof sampleAgent.id === 'string', 'id exists');
  assert(typeof sampleAgent.name === 'string', 'name exists');
  assert(typeof sampleAgent.profile === 'string', 'profile exists');
  assert(typeof sampleAgent.mobilityType === 'string', 'mobilityType exists');
  assert(sampleAgent.status === 'idle', 'initial status is idle');
  assert(typeof sampleAgent.currentFloor === 'number', 'currentFloor exists');
  assert(typeof sampleAgent.position.x === 'number', 'position.x exists');
  assert(typeof sampleAgent.position.y === 'number', 'position.y exists');
  assert(typeof sampleAgent.position.z === 'number', 'position.z exists');
  assert(typeof sampleAgent.destination === 'string', 'destination exists');
  assert(typeof sampleAgent.targetExitId === 'string', 'targetExitId exists');
  assert(Array.isArray(sampleAgent.currentRoute), 'currentRoute is array');
  assert(Array.isArray(sampleAgent.routeWaypoints), 'routeWaypoints is array');
  assert(typeof sampleAgent.currentWaypointIndex === 'number', 'currentWaypointIndex exists');
  assert(typeof sampleAgent.walkingSpeed === 'number', 'walkingSpeed exists');
  assert(typeof sampleAgent.currentSpeed === 'number', 'currentSpeed exists');
  assert(typeof sampleAgent.reactionTime === 'number', 'reactionTime exists');
  assert(typeof sampleAgent.reactionRemaining === 'number', 'reactionRemaining exists');
  assert(typeof sampleAgent.personalSpaceRadius === 'number', 'personalSpaceRadius exists');
  assert(typeof sampleAgent.queueWaitTime === 'number', 'queueWaitTime exists');
  assert(typeof sampleAgent.isBlockedOrQueued === 'boolean', 'isBlockedOrQueued exists');
  assert(typeof sampleAgent.hazardExposure === 'number', 'hazardExposure exists');
  assert(typeof sampleAgent.riskScore === 'number', 'riskScore exists');
  assert(typeof sampleAgent.currentCongestionState === 'string', 'currentCongestionState exists');
  console.log('  ✅ PASSED: All required SimulatedAgent attributes exist and are correctly typed.\n');

  // -------------------------------------------------------------
  // TEST 3: Multi-Step Kinematic Determinism (100 Fixed Timesteps)
  // -------------------------------------------------------------
  console.log('▶ Test 3: Simulation Stepping Determinism (100 steps of 0.05s)');
  CapacityEngine.reset();
  let simA = fleetA.map((a) => ({ ...a, position: { ...a.position } }));
  let timeA = 0;

  for (let step = 0; step < 100; step++) {
    const resA = SimulationEngine.step(simA, FIXED_TIMESTEP, timeA);
    simA = resA.updatedAgents;
    timeA = resA.newElapsedTime;
  }

  CapacityEngine.reset();
  let simB = fleetB.map((a) => ({ ...a, position: { ...a.position } }));
  let timeB = 0;

  for (let step = 0; step < 100; step++) {
    const resB = SimulationEngine.step(simB, FIXED_TIMESTEP, timeB);
    simB = resB.updatedAgents;
    timeB = resB.newElapsedTime;
  }

  assert(timeA === timeB, `Time mismatch: ${timeA} vs ${timeB}`);

  for (let i = 0; i < 150; i++) {
    const a = simA[i];
    const b = simB[i];
    assert(a.status === b.status, `Agent ${a.id} status mismatch after 100 steps`);
    assert(a.position.x === b.position.x, `Agent ${a.id} pos.x mismatch after 100 steps`);
    assert(a.position.y === b.position.y, `Agent ${a.id} pos.y mismatch after 100 steps`);
    assert(a.position.z === b.position.z, `Agent ${a.id} pos.z mismatch after 100 steps`);
    assert(a.distanceTraveled === b.distanceTraveled, `Agent ${a.id} distanceTraveled mismatch`);
  }
  console.log('  ✅ PASSED: Exact bit-for-bit trajectory match after 100 simulation steps.\n');

  // -------------------------------------------------------------
  // TEST 4: Separation of Simulation Time from Render Frame Rate
  // -------------------------------------------------------------
  console.log('▶ Test 4: Simulation Time vs Variable Frame Rate');
  CapacityEngine.reset();
  // Run 1: 60 FPS simulator (16.66ms frames) accumulating FIXED_TIMESTEP (50ms)
  let run1Agents = fleetA.map((a) => ({ ...a, position: { ...a.position } }));
  let run1Time = 0;
  let run1Accum = 0;
  const frameDt60 = 1 / 60;
  for (let frame = 0; frame < 180; frame++) {
    run1Accum += frameDt60;
    while (run1Accum >= FIXED_TIMESTEP - 1e-6) {
      const res = SimulationEngine.step(run1Agents, FIXED_TIMESTEP, run1Time);
      run1Agents = res.updatedAgents;
      run1Time = res.newElapsedTime;
      run1Accum -= FIXED_TIMESTEP;
    }
  }

  CapacityEngine.reset();
  // Run 2: 144 FPS simulator (6.94ms frames) accumulating FIXED_TIMESTEP (50ms)
  let run2Agents = fleetB.map((a) => ({ ...a, position: { ...a.position } }));
  let run2Time = 0;
  let run2Accum = 0;
  const frameDt144 = 1 / 144;
  for (let frame = 0; frame < 432; frame++) {
    run2Accum += frameDt144;
    while (run2Accum >= FIXED_TIMESTEP - 1e-6) {
      const res = SimulationEngine.step(run2Agents, FIXED_TIMESTEP, run2Time);
      run2Agents = res.updatedAgents;
      run2Time = res.newElapsedTime;
      run2Accum -= FIXED_TIMESTEP;
    }
  }

  assert(run1Time === run2Time, `Elapsed simulation time must match regardless of frame rate (${run1Time}s vs ${run2Time}s)`);
  for (let i = 0; i < 150; i++) {
    const a = run1Agents[i];
    const b = run2Agents[i];
    assert(a.position.x === b.position.x, `Agent ${a.id} pos.x match across 60Hz and 144Hz`);
    assert(a.position.z === b.position.z, `Agent ${a.id} pos.z match across 60Hz and 144Hz`);
  }
  console.log(`  ✅ PASSED: Simulation clock (${run1Time}s) and kinematics remain 100% decoupled from render framerate.\n`);

  // -------------------------------------------------------------
  // TEST 5: Personal Space & Basic Following Deceleration
  // -------------------------------------------------------------
  console.log('▶ Test 5: Personal Space & Following Deceleration');
  // Construct two agents in a corridor: Lead Agent (slow) and Follower Agent (fast)
  const leadAgent: SimulatedAgent = {
    ...fleetA[0],
    id: 'LEAD_01',
    status: 'evacuating',
    currentFloor: 1,
    position: { x: 0, y: 0, z: 2.0 },
    walkingSpeed: 0.5,
    currentSpeed: 0.5,
    reactionRemaining: 0,
    personalSpaceRadius: 0.45,
    routeWaypoints: [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 10.0 },
    ],
    currentWaypointIndex: 1,
    queueWaitTime: 0,
    isBlockedOrQueued: false,
  };

  const followerAgent: SimulatedAgent = {
    ...fleetA[1],
    id: 'FOLLOWER_02',
    status: 'evacuating',
    currentFloor: 1,
    position: { x: 0, y: 0, z: 1.2 }, // 0.8m behind lead agent
    walkingSpeed: 1.6, // Wants to walk much faster
    currentSpeed: 1.6,
    reactionRemaining: 0,
    personalSpaceRadius: 0.45,
    routeWaypoints: [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 10.0 },
    ],
    currentWaypointIndex: 1,
    queueWaitTime: 0,
    isBlockedOrQueued: false,
  };

  let pair = [leadAgent, followerAgent];
  let pairTime = 0;

  for (let step = 0; step < 20; step++) {
    const res = SimulationEngine.step(pair, FIXED_TIMESTEP, pairTime);
    pair = res.updatedAgents;
    pairTime = res.newElapsedTime;

    const lead = pair[0];
    const follower = pair[1];
    const distanceBetween = lead.position.z - follower.position.z;

    // Follower must NEVER pass the leader or penetrate STOP_FOLLOW_DISTANCE
    assert(distanceBetween >= STOP_FOLLOW_DISTANCE - 0.05, `Personal space breached: distance was ${distanceBetween.toFixed(3)}m`);
    // Follower speed must be throttled down
    assert(follower.currentSpeed <= lead.walkingSpeed + 0.1 || follower.isBlockedOrQueued, 'Follower must be throttled by leader');
  }
  assert(pair[1].isBlockedOrQueued === true, 'Follower must have isBlockedOrQueued flagged');
  assert(pair[1].queueWaitTime > 0, 'Follower must have accumulated queueWaitTime');
  console.log('  ✅ PASSED: Follower slowed down, respected personal space, and did not penetrate leader boundary.\n');

  // -------------------------------------------------------------
  // TEST 6: Continuous Movement (No Teleportation)
  // -------------------------------------------------------------
  console.log('▶ Test 6: Continuous Kinematic Step Bounds (No Teleportation)');
  let testFleet = fleetA.map((a) => ({ ...a, position: { ...a.position } }));
  let testTime = 0;

  for (let step = 0; step < 50; step++) {
    const prevPositions = testFleet.map((a) => ({ ...a.position }));
    const res = SimulationEngine.step(testFleet, FIXED_TIMESTEP, testTime);
    testFleet = res.updatedAgents;
    testTime = res.newElapsedTime;

    for (let i = 0; i < testFleet.length; i++) {
      const a = testFleet[i];
      const prev = prevPositions[i];
      if (a.status === 'evacuating') {
        const stepDist = Math.hypot(
          a.position.x - prev.x,
          a.position.y - prev.y,
          a.position.z - prev.z
        );
        const maxExpectedDist = a.walkingSpeed * FIXED_TIMESTEP * 1.5 + 0.05;
        assert(
          stepDist <= maxExpectedDist,
          `Agent ${a.id} jumped ${stepDist.toFixed(3)}m in one step (max expected ${maxExpectedDist.toFixed(3)}m)`
        );
      }
    }
  }
  console.log('  ✅ PASSED: All agent displacements strictly obey maximum physical velocity bounds per tick (0 teleportation).\n');

  // -------------------------------------------------------------
  // TEST 7: Correct Stair Speed Reduction & Floor Elevation Mapping
  // -------------------------------------------------------------
  console.log('▶ Test 7: Stairway Kinematics & Floor Elevation Derivation');
  const stairAgent: SimulatedAgent = {
    ...fleetA[0],
    id: 'STAIR_AGENT',
    status: 'evacuating',
    currentFloor: 2,
    position: { x: 0, y: 4.0, z: 0 },
    walkingSpeed: 1.4,
    currentSpeed: 1.4,
    reactionRemaining: 0,
    routeWaypoints: [
      { x: 0, y: 4.0, z: 0 },
      { x: 0, y: 0.0, z: 4.0 }, // Moving down to Floor 1
    ],
    currentWaypointIndex: 1,
  };

  const stairRes = SimulationEngine.step([stairAgent], FIXED_TIMESTEP, 0);
  const updatedStair = stairRes.updatedAgents[0];
  const expectedStairSpeed = Number((1.4 * 0.55).toFixed(2));
  assert(
    updatedStair.currentSpeed === expectedStairSpeed,
    `Stair descent speed must be reduced to ${expectedStairSpeed}, got ${updatedStair.currentSpeed}`
  );
  console.log('  ✅ PASSED: Stair traversal speed correctly throttled by 0.55x multiplier.\n');

  console.log('========================================================');
  console.log('🎉 ALL PHASE A VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

runPhaseATests();
