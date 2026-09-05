/**
 * EVACUATE-AI Top Application Bar
 */

import React from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Compass,
  Activity,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useEvacuateStore } from '../../store/useEvacuateStore';

export const Header: React.FC = () => {
  const {
    graph,
    validationReport,
    simulationMetrics,
    showGraphNodes,
    showGraphEdges,
    showBuildingMesh,
    showRoutePath,
    showAgents,
    cameraPreset,
    setShowGraphNodes,
    setShowGraphEdges,
    setShowBuildingMesh,
    setShowRoutePath,
    setShowAgents,
    setCameraPreset,
  } = useEvacuateStore();

  const nodeCount = graph.nodes.size;
  const edgeCount = graph.edges.size;
  const hasErrors = (validationReport?.errorCount ?? 0) > 0;

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white select-none">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tracking-wider font-bold text-sky-400">
              EVACUATE-AI
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-sky-950 text-sky-300 border border-sky-800">
              PHASE 3: AGENT-BASED EVACUATION
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Microscopic Occupant Kinematics & Graph Egress Simulation
          </p>
        </div>
      </div>

      {/* Metrics Badges */}
      <div className="hidden lg:flex items-center gap-2 font-mono text-xs">
        <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">AGENTS:</span>{' '}
          <span className="font-bold text-sky-400">{simulationMetrics.totalAgents}</span>
        </div>
        <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
          <span className="text-slate-400">NODES:</span>{' '}
          <span className="font-bold text-slate-200">{nodeCount}</span>
        </div>
        <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
          <span className="text-slate-400">EDGES:</span>{' '}
          <span className="font-bold text-indigo-400">{edgeCount}</span>
        </div>
        <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
          <span className="text-slate-400">EXITS:</span>{' '}
          <span className="font-bold text-emerald-400">
            {validationReport?.metrics.totalExits ?? 4}
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
            hasErrors
              ? 'bg-red-950/60 border-red-800 text-red-300'
              : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{hasErrors ? `ERRORS: ${validationReport?.errorCount}` : 'TOPOLOGY VALID'}</span>
        </div>
      </div>

      {/* Camera Presets & Layer Toggles */}
      <div className="flex items-center gap-2">
        {/* Camera Views */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs">
          <button
            onClick={() => setCameraPreset('isometric')}
            className={`px-2 py-1 rounded transition-colors ${
              cameraPreset === 'isometric'
                ? 'bg-sky-600 text-white font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Isometric 3D View"
          >
            ISO
          </button>
          <button
            onClick={() => setCameraPreset('top_down')}
            className={`px-2 py-1 rounded transition-colors ${
              cameraPreset === 'top_down'
                ? 'bg-sky-600 text-white font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Top-Down Plan View"
          >
            PLAN
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className={`px-2 py-1 rounded transition-colors ${
              cameraPreset === 'front'
                ? 'bg-sky-600 text-white font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Front Elevation View"
          >
            FRONT
          </button>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs">
          <button
            onClick={() => setShowAgents(!showAgents)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              showAgents ? 'bg-sky-600/30 text-sky-300 font-bold' : 'text-slate-500'
            }`}
            title="Toggle Agents"
          >
            <Users className="w-3 h-3" />
            Agents
          </button>
          <button
            onClick={() => setShowGraphNodes(!showGraphNodes)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              showGraphNodes ? 'bg-sky-600/30 text-sky-300' : 'text-slate-500'
            }`}
            title="Toggle Graph Nodes"
          >
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            Nodes
          </button>
          <button
            onClick={() => setShowGraphEdges(!showGraphEdges)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              showGraphEdges ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-500'
            }`}
            title="Toggle Graph Edges"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
            Edges
          </button>
          <button
            onClick={() => setShowBuildingMesh(!showBuildingMesh)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              showBuildingMesh ? 'bg-slate-700 text-slate-200' : 'text-slate-500'
            }`}
            title="Toggle 3D Floor Mesh"
          >
            <Layers className="w-3 h-3" />
            Mesh
          </button>
        </div>
      </div>
    </header>
  );
};
