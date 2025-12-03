import React from 'react';
import { AllocatedSpace, FreeSpace } from '../types';
import { Layers, Box, ArrowRight } from 'lucide-react';

interface StatsPanelProps {
  freeList: FreeSpace[];
  allocatedList: AllocatedSpace[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ freeList, allocatedList }) => {
  // Sorting for display
  const sortedFree = [...freeList].sort((a, b) => a.startAddress - b.startAddress);
  const sortedAlloc = [...allocatedList].sort((a, b) => a.startAddress - b.startAddress);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Allocated Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-80">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="bg-blue-100 p-1.5 rounded-lg"><Layers className="w-4 h-4 text-blue-600" /></div>
          <h3 className="font-bold text-slate-700 text-sm">已分配分区表</h3>
          <span className="ml-auto bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{sortedAlloc.length}</span>
        </div>
        <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-5 py-3 font-semibold">作业名</th>
                <th className="px-5 py-3 font-semibold">地址范围</th>
                <th className="px-5 py-3 font-semibold text-right">大小</th>
              </tr>
            </thead>
            <tbody>
              {sortedAlloc.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-400 italic text-xs">暂无已分配作业</td>
                </tr>
              ) : (
                sortedAlloc.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-2.5 font-bold text-blue-600">{item.jobName}</td>
                    <td className="px-5 py-2.5 font-mono text-slate-500 text-xs">
                        {item.startAddress} <span className="text-slate-300 mx-1">➜</span> {item.startAddress + item.length}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-slate-700 font-medium">{item.length.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Free Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-80">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="bg-emerald-100 p-1.5 rounded-lg"><Box className="w-4 h-4 text-emerald-600" /></div>
          <h3 className="font-bold text-slate-700 text-sm">空闲分区表</h3>
          <span className="ml-auto bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{sortedFree.length}</span>
        </div>
        <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-5 py-3 font-semibold">分区ID</th>
                <th className="px-5 py-3 font-semibold">地址范围</th>
                <th className="px-5 py-3 font-semibold text-right">可用大小</th>
              </tr>
            </thead>
            <tbody>
              {sortedFree.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-red-400 italic font-bold text-xs">
                    <div className="flex flex-col items-center gap-2">
                        <span>⚠️ 内存已满 (Full)</span>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedFree.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-emerald-50/30 transition-colors">
                    <td className="px-5 py-2.5 text-slate-400 text-xs font-mono">#{idx + 1}</td>
                    <td className="px-5 py-2.5 font-mono text-slate-500 text-xs">
                        {item.startAddress} <span className="text-slate-300 mx-1">➜</span> {item.startAddress + item.length}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-emerald-600 font-bold">{item.length.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};