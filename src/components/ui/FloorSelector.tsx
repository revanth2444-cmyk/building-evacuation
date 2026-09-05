/**
 * Floor Selector Component
 * Controls floor slicing and floor-specific graph inspection.
 */

import React from 'react';
import { useEvacuateStore } from '../../store/useEvacuateStore';
import { FloorId } from '../../types/building';
import { Building2 } from 'lucide-react';

const FLOORS: { id: FloorId; label: string; elevation: string; name: string }[] = [
  { id: 5, label: 'F5', elevation: '16.0m', name: 'Executive & Terrace' },
  { id: 4, label: 'F4', elevation: '12.0m', name: 'Boardroom & Strategy' },
  { id: 3, label: 'F3', elevation: '8.0m', name: 'R&D Labs & Datacenter' },
  { id: 2, label: 'F2', elevation: '4.0m', name: 'Open Workspace & Lounge' },
  { id: 1, label: 'F1', elevation: '0.0m', name: 'Main Lobby & Exits' },
];

export const FloorSelector: React.FC = () => {
  const { activeFloor, setActiveFloor } = useEvacuateStore();

  return (
    <div className="absolute top-20 left-4 z-10 flex flex-col gap-1 p-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 shadow-2xl select-none">
      <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800">
        <Building2 className="w-3.5 h-3.5 text-sky-400" />
        <span>Floor Level</span>
      </div>

      {/* ALL FLOORS BUTTON */}
      <button
        onClick={() => setActiveFloor('all')}
        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all ${
          activeFloor === 'all'
            ? 'bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <span>ALL FLOORS</span>
        <span className="text-[10px] opacity-75">STACK</span>
      </button>

      {/* FLOORS 5 DOWN TO 1 */}
      {FLOORS.map((f) => {
        const isActive = activeFloor === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setActiveFloor(f.id)}
            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-all ${
              isActive
                ? 'bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">{f.label}</span>
              <span className="text-[11px] text-slate-400 truncate max-w-[110px] text-left">
                {f.name}
              </span>
            </div>
            <span className="text-[10px] opacity-60 text-right">{f.elevation}</span>
          </button>
        );
      })}
    </div>
  );
};
