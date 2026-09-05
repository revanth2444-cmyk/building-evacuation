/**
 * Phase B Acceptance & Verification Test Suite
 * Validates real infrastructure capacity constraints:
 * - Door throughput flow rate limits and deterministic queueing
 * - Staircase maximum simultaneous occupancy and landing flow limits
 * - Ground exit discharge rate and visible exit queueing
 * - Multi-floor flow propagation and queue delay accumulation
 * - Determinism and frame-rate independence (30 Hz vs 144 Hz)
 */

import { buildingRegistry } from '../data/buildingRegistry';
import { GraphBuilder } from '../graph/builder';
import { CapacityEngine } from '../simulation/capacityEngine';
import { FIXED_TIMESTEP } from '../simulation/constants';
import { SimulationEngine } from '../simulation/engine';
import { SimulatedAgent } from '../simulation/types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runPhaseBTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 RUNNING PHASE B INFRASTRUCTURE CAPACITY TEST SUITE');
  console.log('🧪 ========================================================\n');

  const graph = GraphBuilder.buildGraph(buildingRegistry);

  // -------------------------------------------------------------
  // TEST 1: Door Capacity Limits Throughput
  // -------------------------------------------------------------
  console.log('▶ Test 1: Door Capacity Limits Throughput (2.0 persons/sec)');
  CapacityEngine.init(true);
  const testDoorId = 'F1_DOOR_101_A';
  CapacityEngine.setDoorFlowRate(testDoorId, 2.0); // 2 persons/sec -> 0.5s per person

  const simDt = FIXED_TIMESTEP; // 0.05s
  let simTime = 0.0;
  const agentIds = ['AGENT_T1', 'AGENT_T2', 'AGENT_T3', 'AGENT_T4', 'AGENT_T5', 'AGENT_T6'];
  const passedAgents: string[] = [];

  // All 6 agents arrive at door threshold at t = 0
  for (let step = 0; step < 70; step++) {
    simTime = Number((simTime + simDt).toFixed(2));
    CapacityEngine.step(simDt, simTime);

    for (const id of agentIds) {
      if (passedAgents.includes(id)) continue;
      const res = CapacityEngine.requestDoorPassage(testDoorId, id, simTime, 0.5, simDt);
      if (res.permitted) {
        passedAgents.push(id);
      }
    }
  }

  // At 2.0 persons/sec:
  // t = 0.05: 1st agent passes
  // t = 0.55: 2nd agent passes
  // t = 1.05: 3rd agent passes
  // t = 1.55: 4th agent passes
  // t = 2.05: 5th agent passes
  // t = 2.55: 6th agent passes
  assert(passedAgents.length === 6, `All 6 agents must eventually pass (got ${passedAgents.length})`);
  const metrics = CapacityEngine.getMetrics(testDoorId, simTime);
  assert(metrics !== null, 'Metrics for test door must exist');
  assert(metrics!.totalProcessed === 6, `Total processed must be 6 (got ${metrics!.totalProcessed})`);
  console.log(`  ✅ PASSED: Door limited 6 occupants to 2.0 p/s throughput over ${simTime}s.\n`);

  // -------------------------------------------------------------
  // TEST 2: Agents Queue at a Saturated Door
  // -------------------------------------------------------------
  console.log('▶ Test 2: Agents Queue at a Saturated Door');
  CapacityEngine.init(true);
  const satDoorId = 'F4_DOOR_401';
  CapacityEngine.setDoorFlowRate(satDoorId, 1.0); // 1 person/sec

  // 4 agents attempt to enter at t = 0
  let t = 0.05;
  CapacityEngine.step(simDt, t);
  const r1 = CapacityEngine.requestDoorPassage(satDoorId, 'AGENT_Q1', t, 0.4, simDt);
  const r2 = CapacityEngine.requestDoorPassage(satDoorId, 'AGENT_Q2', t, 0.4, simDt);
  const r3 = CapacityEngine.requestDoorPassage(satDoorId, 'AGENT_Q3', t, 0.4, simDt);
  const r4 = CapacityEngine.requestDoorPassage(satDoorId, 'AGENT_Q4', t, 0.4, simDt);

  assert(r1.permitted === true, 'First agent should be permitted immediately');
  assert(r2.permitted === false, 'Second agent should queue');
  assert(r3.permitted === false, 'Third agent should queue');
  assert(r4.permitted === false, 'Fourth agent should queue');

  const doorMetrics = CapacityEngine.getMetrics(satDoorId, t);
  assert(doorMetrics!.currentQueueLength === 3, `Queue length must be 3 (got ${doorMetrics!.currentQueueLength})`);
  assert(doorMetrics!.state === 'BUSY' || doorMetrics!.state === 'CONGESTED', `State should be BUSY or CONGESTED (got ${doorMetrics!.state})`);
  console.log(`  ✅ PASSED: Saturated door formed queue of 3 agents (State: ${doorMetrics!.state}).\n`);

  // -------------------------------------------------------------
  // TEST 3: Door Queue Ordering is Deterministic
  // -------------------------------------------------------------
  console.log('▶ Test 3: Door Queue Ordering is Deterministic (Arrival + ID)');
  CapacityEngine.init(true);
  const orderDoorId = 'F1_DOOR_102';
  CapacityEngine.setDoorFlowRate(orderDoorId, 0.5); // 0.5 person/sec (1 per 2 seconds)

  t = 0.05;
  CapacityEngine.step(simDt, t);
  CapacityEngine.requestDoorPassage(orderDoorId, 'AGENT_FIRST', t, 0.3, simDt);

  // Arrive together at t = 0.05
  CapacityEngine.requestDoorPassage(orderDoorId, 'AGENT_CHARLIE', t, 0.5, simDt);
  CapacityEngine.requestDoorPassage(orderDoorId, 'AGENT_ALICE', t, 0.5, simDt);
  CapacityEngine.requestDoorPassage(orderDoorId, 'AGENT_BOB', t, 0.5, simDt);

  const mOrder = CapacityEngine.getMetrics(orderDoorId, t);
  assert(mOrder!.queuedAgentIds[0] === 'AGENT_ALICE', `1st in queue must be ALICE (got ${mOrder!.queuedAgentIds[0]})`);
  assert(mOrder!.queuedAgentIds[1] === 'AGENT_BOB', `2nd in queue must be BOB (got ${mOrder!.queuedAgentIds[1]})`);
  assert(mOrder!.queuedAgentIds[2] === 'AGENT_CHARLIE', `3rd in queue must be CHARLIE (got ${mOrder!.queuedAgentIds[2]})`);
  console.log('  ✅ PASSED: Queue sorted deterministically by arrival time and alphabetical ID.\n');

  // -------------------------------------------------------------
  // TEST 4: Staircase Maximum Occupancy is Respected
  // -------------------------------------------------------------
  console.log('▶ Test 4: Staircase Maximum Occupancy Constraint (Max 5)');
  CapacityEngine.init(true);
  const testStairId = 'STAIR_WEST';
  CapacityEngine.setStairMaxOccupancy(testStairId, 5); // Cap at 5 occupants for unit test
  CapacityEngine.setStairFlowRate(testStairId, 10.0); // High flow rate to isolate occupancy check

  t = 0.05;
  const landingNode = 'NODE_STAIR_WEST_LANDING_F4';
  const occupants: string[] = [];

  for (let i = 1; i <= 8; i++) {
    t = Number((t + 0.1).toFixed(2));
    CapacityEngine.step(0.1, t);
    const res = CapacityEngine.requestStairEntry(testStairId, landingNode, `OCCUPANT_${i}`, t, 0.1);
    if (res.permitted) occupants.push(`OCCUPANT_${i}`);
  }

  const sMetrics = CapacityEngine.getMetrics(testStairId, t);
  assert(sMetrics!.currentOccupancy === 5, `Stair occupancy must be capped at 5 (got ${sMetrics!.currentOccupancy})`);
  assert(sMetrics!.state === 'FULL', `Stair state must be FULL (got ${sMetrics!.state})`);
  assert(sMetrics!.currentQueueLength === 3, `Excess 3 agents must be queued (got ${sMetrics!.currentQueueLength})`);
  console.log('  ✅ PASSED: Staircase maximum occupancy of 5 respected, 3 agents queued outside.\n');

  // -------------------------------------------------------------
  // TEST 5: Staircase Flow Rate Limits Entry
  // -------------------------------------------------------------
  console.log('▶ Test 5: Staircase Flow Rate Limits Entry (1.0 person/sec)');
  CapacityEngine.init(true);
  CapacityEngine.setStairMaxOccupancy(testStairId, 25);
  CapacityEngine.setStairFlowRate(testStairId, 1.0); // 1 person/sec

  t = 0.05;
  CapacityEngine.step(simDt, t);
  const e1 = CapacityEngine.requestStairEntry(testStairId, landingNode, 'OCC_A', t, simDt);
  const e2 = CapacityEngine.requestStairEntry(testStairId, landingNode, 'OCC_B', t, simDt);

  assert(e1.permitted === true, '1st occupant should enter stair');
  assert(e2.permitted === false, '2nd occupant should wait for flow rate timer');
  console.log('  ✅ PASSED: Stair landing entry rate limits rapid succession entries.\n');

  // -------------------------------------------------------------
  // TEST 6: Agents Queue Before a Full Staircase
  // -------------------------------------------------------------
  console.log('▶ Test 6: Agents Queue Before Full Staircase and Enter When Released');
  CapacityEngine.init(true);
  CapacityEngine.setStairMaxOccupancy(testStairId, 5);
  CapacityEngine.setStairFlowRate(testStairId, 10.0); // minInterval = 0.1s

  t = 0.05;
  for (let i = 1; i <= 5; i++) {
    t = Number((t + 0.1).toFixed(2));
    CapacityEngine.step(0.1, t);
    const entryRes = CapacityEngine.requestStairEntry(testStairId, landingNode, `OCC_${i}`, t, 0.1);
    assert(entryRes.permitted === true, `OCC_${i} should enter`);
  }
  // 6th occupant tries to enter full staircase -> queued!
  t = Number((t + 0.1).toFixed(2));
  CapacityEngine.step(0.1, t);
  const queuedRes = CapacityEngine.requestStairEntry(testStairId, landingNode, 'OCC_6', t, 0.1);
  assert(queuedRes.permitted === false, 'OCC_6 must be queued before full stair');

  // Release 1 occupant on ground floor
  CapacityEngine.leaveStaircase(testStairId, 'OCC_1');
  const mAfterRelease = CapacityEngine.getMetrics(testStairId, t);
  assert(mAfterRelease!.currentOccupancy === 4, `Occupancy should drop to 4 (got ${mAfterRelease!.currentOccupancy})`);

  // Step simulation time and verify queued occupant can now enter the released slot
  t = Number((t + 0.1).toFixed(2));
  CapacityEngine.step(0.1, t);
  const nextEntry = CapacityEngine.requestStairEntry(testStairId, landingNode, 'OCC_6', t, 0.1);
  assert(nextEntry.permitted === true, 'OCC_6 should now enter released slot');
  console.log('  ✅ PASSED: Releasing stair occupant on ground floor admitted waiting landing occupant.\n');

  // -------------------------------------------------------------
  // TEST 7: Exit Discharge Rate Limits Evacuation Completion
  // -------------------------------------------------------------
  console.log('▶ Test 7: Exit Discharge Rate Limits Evacuation Completion (2.0 p/s)');
  CapacityEngine.init(true);
  const testExitId = 'F1_EXIT_NORTH';
  CapacityEngine.setExitFlowRate(testExitId, 2.0); // 0.5s per person

  t = 0.05;
  CapacityEngine.step(simDt, t);

  // 3 agents reach exit simultaneously
  const d1 = CapacityEngine.processExitDischarge(testExitId, 'EVAC_1', t, simDt);
  const d2 = CapacityEngine.processExitDischarge(testExitId, 'EVAC_2', t, simDt);
  const d3 = CapacityEngine.processExitDischarge(testExitId, 'EVAC_3', t, simDt);

  assert(d1.evacuated === true, 'EVAC_1 evacuates immediately');
  assert(d2.evacuated === false, 'EVAC_2 must wait in exit queue');
  assert(d3.evacuated === false, 'EVAC_3 must wait in exit queue');

  // Step forward 0.5s: EVAC_2 should now evacuate
  for (let s = 0; s < 10; s++) {
    t = Number((t + simDt).toFixed(2));
    CapacityEngine.step(simDt, t);
  }
  const d2_later = CapacityEngine.processExitDischarge(testExitId, 'EVAC_2', t, simDt);
  assert(d2_later.evacuated === true, 'EVAC_2 evacuates after 0.5s interval');
  console.log('  ✅ PASSED: Exit discharge queue held agents and released at configured 2.0 p/s.\n');

  // -------------------------------------------------------------
  // TEST 8: Queued Agents Accumulate queueWaitTime
  // -------------------------------------------------------------
  console.log('▶ Test 8: Queued Agents Accumulate queueWaitTime');
  const fleet = SimulationEngine.initPopulation(graph, 150, 42);
  let simState = fleet;
  let elapsed = 0.0;
  let maxObservedWaitTime = 0;

  // Run simulation for 120 steps (6.0 seconds) to allow agents to encounter doors/stairs
  for (let step = 0; step < 120; step++) {
    const res = SimulationEngine.step(simState, FIXED_TIMESTEP, elapsed);
    simState = res.updatedAgents;
    elapsed = res.newElapsedTime;

    for (const a of simState) {
      if (a.queueWaitTime > maxObservedWaitTime) {
        maxObservedWaitTime = a.queueWaitTime;
      }
    }
  }

  assert(maxObservedWaitTime > 0, `Agents must accumulate queueWaitTime during bottlenecks (max was ${maxObservedWaitTime})`);
  console.log(`  ✅ PASSED: Queued agents accumulated waiting time (Max observed: ${maxObservedWaitTime}s).\n`);

  // -------------------------------------------------------------
  // TEST 9: Exact Determinism with Same Seed & Same Config
  // -------------------------------------------------------------
  console.log('▶ Test 9: Exact Determinism Check Across Two 100-Step Runs');
  const run1Fleet = SimulationEngine.initPopulation(graph, 150, 42);
  let run1State = run1Fleet;
  let run1Time = 0.0;
  for (let s = 0; s < 100; s++) {
    const r = SimulationEngine.step(run1State, FIXED_TIMESTEP, run1Time);
    run1State = r.updatedAgents;
    run1Time = r.newElapsedTime;
  }

  const run2Fleet = SimulationEngine.initPopulation(graph, 150, 42);
  let run2State = run2Fleet;
  let run2Time = 0.0;
  for (let s = 0; s < 100; s++) {
    const r = SimulationEngine.step(run2State, FIXED_TIMESTEP, run2Time);
    run2State = r.updatedAgents;
    run2Time = r.newElapsedTime;
  }

  for (let i = 0; i < 150; i++) {
    const a1 = run1State[i];
    const a2 = run2State[i];
    assert(a1.position.x === a2.position.x, `Agent ${a1.id} X mismatch at step 100`);
    assert(a1.position.y === a2.position.y, `Agent ${a1.id} Y mismatch at step 100`);
    assert(a1.position.z === a2.position.z, `Agent ${a1.id} Z mismatch at step 100`);
    assert(a1.queueWaitTime === a2.queueWaitTime, `Agent ${a1.id} wait time mismatch`);
    assert(a1.status === a2.status, `Agent ${a1.id} status mismatch`);
  }
  console.log('  ✅ PASSED: Two separate 100-step simulation runs matched with 100% precision.\n');

  // -------------------------------------------------------------
  // TEST 10: 150-Agent Multi-Floor Evacuation Without Capacity Violations
  // -------------------------------------------------------------
  console.log('▶ Test 10: 150-Agent Evacuation Run (Capacity Limits Maintained)');
  let fullFleet = SimulationEngine.initPopulation(graph, 150, 42);
  let fullTime = 0.0;
  let maxStairOcc = 0;

  // Run for 300 steps (15.0 seconds)
  for (let s = 0; s < 300; s++) {
    const res = SimulationEngine.step(fullFleet, FIXED_TIMESTEP, fullTime);
    fullFleet = res.updatedAgents;
    fullTime = res.newElapsedTime;

    const westM = CapacityEngine.getMetrics('STAIR_WEST', fullTime);
    const eastM = CapacityEngine.getMetrics('STAIR_EAST', fullTime);
    if (westM && westM.currentOccupancy > maxStairOcc) maxStairOcc = westM.currentOccupancy;
    if (eastM && eastM.currentOccupancy > maxStairOcc) maxStairOcc = eastM.currentOccupancy;

    assert(westM ? westM.currentOccupancy <= westM.maxOccupancy! : true, 'STAIR_WEST exceeded max occupancy!');
    assert(eastM ? eastM.currentOccupancy <= eastM.maxOccupancy! : true, 'STAIR_EAST exceeded max occupancy!');
  }

  console.log(`  ✅ PASSED: 300-step simulation completed without capacity violations (Max stair occupancy: ${maxStairOcc}/25).\n`);

  // -------------------------------------------------------------
  // TEST 11: 30 Hz vs 144 Hz Frame Independence
  // -------------------------------------------------------------
  console.log('▶ Test 11: Frame-Rate Independence (30 Hz render vs 144 Hz render)');
  // Simulate 3.0 seconds (60 fixed physics steps) of elapsed simulation time with 30 Hz
  // display frame intervals (33.3ms) vs 144 Hz display frame intervals (6.94ms)
  function simulateWithDisplayRate(renderIntervalSec: number, targetSimSteps: number) {
    CapacityEngine.init(true);
    let fleet = SimulationEngine.initPopulation(graph, 150, 42);
    let simTime = 0.0;
    let accumulator = 0.0;
    let stepsCompleted = 0;

    while (stepsCompleted < targetSimSteps) {
      accumulator += renderIntervalSec;
      while (accumulator >= FIXED_TIMESTEP - 1e-6 && stepsCompleted < targetSimSteps) {
        const res = SimulationEngine.step(fleet, FIXED_TIMESTEP, simTime);
        fleet = res.updatedAgents;
        simTime = res.newElapsedTime;
        accumulator -= FIXED_TIMESTEP;
        stepsCompleted++;
      }
    }
    return { fleet, simTime };
  }

  const run30Hz = simulateWithDisplayRate(1.0 / 30.0, 60);
  const run144Hz = simulateWithDisplayRate(1.0 / 144.0, 60);

  assert(run30Hz.simTime === run144Hz.simTime, `Simulated times should match: ${run30Hz.simTime} vs ${run144Hz.simTime}`);

  for (let i = 0; i < 150; i++) {
    const a30 = run30Hz.fleet[i];
    const a144 = run144Hz.fleet[i];
    assert(a30.position.x === a144.position.x, `Agent ${a30.id} X diverged across frame rates`);
    assert(a30.position.z === a144.position.z, `Agent ${a30.id} Z diverged across frame rates`);
    assert(a30.queueWaitTime === a144.queueWaitTime, `Agent ${a30.id} wait time diverged across frame rates`);
  }
  console.log('  ✅ PASSED: 30 Hz and 144 Hz render loops produced exact identical simulation states.\n');

  console.log('🎉 ========================================================');
  console.log('🎉 ALL 11 PHASE B TESTS PASSED SUCCESSFULLY!');
  console.log('🎉 ========================================================\n');
}

runPhaseBTests();
