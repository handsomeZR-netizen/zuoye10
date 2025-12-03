import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AllocatedSpace, FreeSpace, MemoryBlock, TOTAL_MEMORY } from '../types';

interface MemoryBarProps {
  freeList: FreeSpace[];
  allocatedList: AllocatedSpace[];
}

export const MemoryBar: React.FC<MemoryBarProps> = ({ freeList, allocatedList }) => {
  // Combine and sort for rendering
  const allBlocks: MemoryBlock[] = [...freeList, ...allocatedList].sort((a, b) => a.startAddress - b.startAddress);

  // Animation variants
  const blockVariants = {
    initial: { 
      opacity: 0, 
      scaleY: 0.3,
      y: 10
    },
    animate: { 
      opacity: 1, 
      scaleY: 1,
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        mass: 1
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: { duration: 0.2 } 
    }
  };

  return (
    <div className="w-full bg-slate-200/50 p-1.5 rounded-xl border border-slate-300/50 shadow-inner h-36 flex relative overflow-hidden ring-1 ring-slate-900/5 backdrop-blur-sm">
      <AnimatePresence mode='popLayout'>
        {allBlocks.map((block) => {
          const widthPercent = (block.length / TOTAL_MEMORY) * 100;
          const isAllocated = block.type === 'allocated';
          const isTiny = widthPercent < 2;
          
          return (
            <motion.div
              layout
              key={block.id}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={blockVariants}
              className={`
                h-full relative flex flex-col justify-center items-center text-xs font-medium
                border-r border-white/10 hover:brightness-105 hover:z-20 transition-all cursor-default group overflow-hidden
                ${isAllocated 
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg' 
                  : 'bg-emerald-50/80 text-emerald-700/70'
                }
              `}
              style={{ 
                width: `${widthPercent}%`,
                // Custom stripes for free space using simple CSS gradient
                backgroundImage: !isAllocated 
                  ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(16, 185, 129, 0.05) 10px, rgba(16, 185, 129, 0.05) 20px)' 
                  : undefined
              }}
            >
              {/* Glossy sheen effect for allocated blocks */}
              {isAllocated && (
                <motion.div 
                  initial={{ x: '-100%', opacity: 0.5 }}
                  animate={{ x: '200%', opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
                />
              )}

              {/* Block Content */}
              {!isTiny && (
                <div className="flex flex-col items-center truncate px-1 z-10">
                  <span className={`font-bold text-sm ${isAllocated ? 'text-white drop-shadow-md' : 'text-emerald-700'}`}>
                    {isAllocated ? (block as AllocatedSpace).jobName : 'FREE'}
                  </span>
                  <motion.span 
                    layout="position"
                    className={`text-[10px] font-mono mt-0.5 ${isAllocated ? 'opacity-90' : 'opacity-60'}`}
                  >
                    {block.length}
                  </motion.span>
                </div>
              )}

              {/* Memory Address Marker (Start) - Only show if enough space */}
              {widthPercent > 5 && (
                <div className="absolute top-1 left-1 text-[9px] opacity-40 font-mono pointer-events-none">
                  {block.startAddress}
                </div>
              )}

              {/* Hover Tooltip */}
              <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-2 bg-slate-900/90 backdrop-blur text-white text-xs rounded-lg px-3 py-2 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 transform translate-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${isAllocated ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                  <span className="font-bold">{isAllocated ? `作业 ${(block as AllocatedSpace).jobName}` : '空闲区域'}</span>
                </div>
                <div className="space-y-0.5 font-mono text-[10px] text-slate-300">
                   <div className="flex justify-between gap-4"><span>起始:</span> <span className="text-white">{block.startAddress}</span></div>
                   <div className="flex justify-between gap-4"><span>结束:</span> <span className="text-white">{block.startAddress + block.length}</span></div>
                   <div className="flex justify-between gap-4"><span>大小:</span> <span className="text-white">{block.length}</span></div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {/* Empty State / Bug Fallback */}
      {allBlocks.length === 0 && (
         <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">
           系统正在初始化...
         </div>
      )}
    </div>
  );
};