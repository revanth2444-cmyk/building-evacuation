/**
 * Simulation Controls & Real-Time Egress Telemetry HUD
 * Fulfills Phase 3 requirements:
 * - START / PAUSE / RESET controls
 * - Deterministic seed input and agent population selector (100–200 agents)
 * - Basic simulation clock (elapsed time tracking)
 * - Real-time metrics: Total agents, Evacuated agents, Remaining in building, Average evacuation time
 * - Speed multiplier controls (1x, 2x, 5x, 10x)
 * - Behavior profile breakdown
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Users,
  ShieldCheck,
  TrendingUp,
  Dices,
  FastForward,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Info,
} from 'lucide-react';
import { useEvacuateStore } from '../../store/useEvacuateStore';
import { BehaviorProfile } from '../../simulation/types';
import { PROFILE_COLORS } from '../../simulation/generator';

export const SimulationControls: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    simulationState,
    simulationConfig,
    simulationMetrics,
    agents,
    selectedAgentId,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    setSimulationSpeed,
    setSimulationSeed,
    setAgentCount,
    regeneratePopulation,
    setSelectedAgentId,
  } = useEvacuateStore();

  // Format elapsed time as MM:SS.s
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    const padSecs = Number(secs) < 10 ? `0${secs}` : secs;
    return `${mins}:${padSecs}`;
  };

  // Behavior profile breakdown count
  const profileCounts = agents.reduce((acc, a) => {
    acc[a.profile] = (acc[a.profile] || 0) + 1;
    return acc;
  }, {} as Record<BehaviorProfile, number>);

  const profiles: { label: string; key: BehaviorProfile; desc: string }[] = [
    { label: 'Normal', key: 'NORMAL', desc: 'Standard speed & reaction' },
    { label: 'Familiar', key: 'FAMILIAR', desc: 'Rapid reaction, knows nearest exits' },
    { label: 'Unfamiliar', key: 'UNFAMILIAR', desc: 'Visitor, delayed recognition' },
    { label: 'Delayed', key: 'DELAYED', desc: 'Lingers to collect belongings' },
    { label: 'Panic', key: 'PANIC', desc: 'Fast erratic rush' },
    { label: 'Non-Compliant', key: 'NON_COMPLIANT', desc: 'Ignores initial alarm' },
    { label: 'Reduced Mobility', key: 'REDUCED_MOBILITY', desc: 'Requires step-free egress' },
  ];

  const handleRandomSeed = () => {
    const nextSeed = Math.floor(Math.random() * 900000) + 100000;
    setSimulationSeed(nextSeed);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[680px] max-w-[92vw] select-none">
      <div className="flex flex-col rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl text-white font-sans overflow-hidden">
        {/* Top Control Bar with Clock & Main Action Buttons */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
          {/* Simulation Clock */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400">CLOCK:</span>
              <span className="font-bold text-sky-300 text-sm">
                {formatTime(simulationMetrics.elapsedTime)}
              </span>
            </div>

            {/* Status Pill */}
            <span
              className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                simulationState === 'running'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800 animate-pulse'
                  : simulationState === 'paused'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : simulationState === 'completed'
                  ? 'bg-sky-950 text-sky-300 border-sky-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {simulationState === 'running'
                ? 'SIMULATION RUNNING'
                : simulationState === 'paused'
                ? 'SIMULATION PAUSED'
                : simulationState === 'completed'
                ? 'ALL OCCUPANTS EVACUATED'
                : 'STANDBY'}
            </span>
          </div>

          {/* Primary Action Buttons: START, PAUSE, RESET */}
          <div className="flex items-center gap-2">
            {simulationState === 'running' ? (
              <button
                onClick={pauseSimulation}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition-all shadow-md active:scale-95"
                title="Pause Simulation"
              >
                <Pause className="w-3.5 h-3.5" />
                PAUSE
              </button>
            ) : (
              <button
                onClick={startSimulation}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-emerald-600/30 active:scale-95"
                title="Start Simulation"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {simulationState === 'paused' ? 'RESUME' : 'START'}
              </button>
            )}

            <button
              onClick={resetSimulation}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs font-semibold border border-slate-700 transition-colors"
              title="Reset to Initial Spawn States"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              RESET
            </button>

            {/* Speed Multipliers */}
            <div className="flex items-center bg-slate-950/80 rounded-lg p-0.5 border border-slate-700 text-[10px] font-mono">
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimulationSpeed(spd)}
                  className={`px-1.5 py-1 rounded transition-colors ${
                    simulationConfig.simulationSpeed === spd
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Real-time KPI Dashcards */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-slate-950/60 border-b border-slate-800 font-mono text-xs">
          {/* Total Occupants */}
          <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            <div className="text-slate-400 text-[10px] flex items-center gap-1">
              <Users className="w-3 h-3 text-sky-400" />
              TOTAL AGENTS
            </div>
            <div className="text-base font-bold text-white mt-0.5">
              {simulationMetrics.totalAgents}
            </div>
          </div>

          {/* Evacuated */}
          <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            <div className="text-slate-400 text-[10px] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              EVACUATED
            </div>
            <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{simulationMetrics.evacuatedAgents}</span>
              <span className="text-[10px] font-normal text-slate-400">
                ({simulationMetrics.evacuationProgress}%)
              </span>
            </div>
          </div>

          {/* Remaining Inside */}
          <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            <div className="text-slate-400 text-[10px] flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-amber-400" />
              REMAINING
            </div>
            <div className="text-base font-bold text-amber-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{simulationMetrics.remainingAgents}</span>
              {simulationMetrics.queuedAgents > 0 && (
                <span className="text-[10px] font-mono text-orange-400 font-semibold">
                  ({simulationMetrics.queuedAgents} queued)
                </span>
              )}
            </div>
          </div>

          {/* Average Evacuation Time */}
          <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            <div className="text-slate-400 text-[10px] flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-indigo-400" />
              AVG TIME
            </div>
            <div className="text-base font-bold text-indigo-300 mt-0.5">
              {simulationMetrics.averageEvacuationTime > 0
                ? `${simulationMetrics.averageEvacuationTime}s`
                : '—'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5">
          <div
            className="bg-gradient-to-r from-sky-500 to-emerald-400 h-1.5 transition-all duration-300"
            style={{ width: `${simulationMetrics.evacuationProgress}%` }}
          />
        </div>

        {/* Collapsible Detailed Configuration & Profiles */}
        {isExpanded && (
          <div className="p-3 bg-slate-900/90 space-y-3 text-xs">
            {/* Deterministic Seed & Population Controls */}
            <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-slate-800/50 border border-slate-700/80">
              {/* Seed Control */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400">PRNG SEED:</span>
                <input
                  type="number"
                  value={simulationConfig.seed}
                  onChange={(e) => setSimulationSeed(Number(e.target.value) || 1)}
                  className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-sky-400 outline-none"
                />
                <button
                  onClick={handleRandomSeed}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  title="Randomize Deterministic Seed"
                >
                  <Dices className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Agent Count Slider */}
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className="font-mono text-[10px] text-slate-400">
                  POPULATION ({simulationConfig.agentCount}):
                </span>
                <input
                  type="range"
                  min="100"
                  max="200"
                  step="10"
                  value={simulationConfig.agentCount}
                  onChange={(e) => setAgentCount(Number(e.target.value))}
                  className="w-28 accent-sky-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Behavior Profile Badges & Real-time Distribution */}
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                Behavior Profiles Distribution:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 font-mono text-[10px]">
                {profiles.map((p) => {
                  const count = profileCounts[p.key] || 0;
                  return (
                    <div
                      key={p.key}
                      className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col items-center justify-center text-center"
                      title={`${p.label}: ${p.desc}`}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: PROFILE_COLORS[p.key] }}
                        />
                        <span className="font-bold text-white">{count}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 truncate max-w-full">
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
