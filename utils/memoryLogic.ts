import { AllocatedSpace, FreeSpace, AlgorithmType, TOTAL_MEMORY } from '../types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Initial State Creator
export const createInitialMemory = (): { free: FreeSpace[], allocated: AllocatedSpace[] } => {
  return {
    free: [{ id: generateId(), startAddress: 0, length: TOTAL_MEMORY, type: 'free' }],
    allocated: []
  };
};

// Sort free list by address
const sortFreeByAddress = (list: FreeSpace[]) => {
  return [...list].sort((a, b) => a.startAddress - b.startAddress);
};

// --- Coalescing (Merging) Logic ---
export const coalesceFreeSpaces = (freeList: FreeSpace[]): FreeSpace[] => {
  if (freeList.length <= 1) return freeList;
  
  const sorted = sortFreeByAddress(freeList);
  const merged: FreeSpace[] = [];
  
  let current = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    // If adjacent, merge
    if (current.startAddress + current.length === next.startAddress) {
      current = {
        ...current,
        length: current.length + next.length
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
};

// --- Helper: Calculate Fragmentation ---
// External Fragmentation = 1 - (Largest Free Block / Total Free Memory)
// Returns 0 to 1 (0% to 100%)
export const calculateFragmentation = (freeList: FreeSpace[]): number => {
  if (freeList.length === 0) return 0;
  
  const totalFree = freeList.reduce((sum, block) => sum + block.length, 0);
  if (totalFree === 0) return 0;

  const maxBlock = Math.max(...freeList.map(b => b.length));
  
  return 1 - (maxBlock / totalFree);
};

// --- Memory Compaction Logic (Task Extension) ---
export const compactMemory = (
  allocatedList: AllocatedSpace[]
): { freeList: FreeSpace[], allocatedList: AllocatedSpace[] } => {
  
  // Sort allocated blocks by address to maintain relative order (sliding them down)
  const sortedAlloc = [...allocatedList].sort((a, b) => a.startAddress - b.startAddress);
  
  let currentAddr = 0;
  const newAllocatedList: AllocatedSpace[] = sortedAlloc.map(block => {
    // We preserve the ID to allow Framer Motion to animate the slide from old position to new position
    const newBlock = { 
      ...block, 
      startAddress: currentAddr,
    };
    currentAddr += block.length;
    return newBlock;
  });

  const freeStart = currentAddr;
  const freeLength = TOTAL_MEMORY - freeStart;
  
  // Create one big free block at the end
  const newFreeList: FreeSpace[] = freeLength > 0 ? [{
    id: generateId(), // New ID for the merged free space
    startAddress: freeStart,
    length: freeLength,
    type: 'free'
  }] : [];

  return { allocatedList: newAllocatedList, freeList: newFreeList };
};

// --- Allocation Algorithms ---

interface AllocationResult {
  success: boolean;
  freeList: FreeSpace[];
  allocatedList: AllocatedSpace[];
  lastAllocPtr?: number; 
  message?: string;
}

export const allocateMemory = (
  jobName: string,
  size: number,
  freeList: FreeSpace[],
  allocatedList: AllocatedSpace[],
  algorithm: AlgorithmType,
  lastAllocPtr: number = 0
): AllocationResult => {
  
  if (size <= 0) return { success: false, freeList, allocatedList, message: '分配大小必须大于0' };
  if (allocatedList.find(j => j.jobName === jobName)) return { success: false, freeList, allocatedList, message: `作业 ${jobName} 已存在` };
  if (size > TOTAL_MEMORY) return { success: false, freeList, allocatedList, message: `请求超过总内存容量` };

  let targetIndex = -1;
  let sortedFree = sortFreeByAddress(freeList);

  // 1. First Fit
  if (algorithm === 'First Fit') {
    targetIndex = sortedFree.findIndex(block => block.length >= size);
  }
  
  // 2. Best Fit
  else if (algorithm === 'Best Fit') {
    let bestIdx = -1;
    let minDiff = Infinity;
    sortedFree.forEach((block, idx) => {
      if (block.length >= size) {
        const diff = block.length - size;
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = idx;
        }
      }
    });
    targetIndex = bestIdx;
  }
  
  // 3. Worst Fit
  else if (algorithm === 'Worst Fit') {
    let worstIdx = -1;
    let maxLen = -1;
    sortedFree.forEach((block, idx) => {
      if (block.length >= size && block.length > maxLen) {
        maxLen = block.length;
        worstIdx = idx;
      }
    });
    targetIndex = worstIdx;
  }
  
  // 4. Next Fit
  else if (algorithm === 'Next Fit') {
    // Find first block that starts *after* or *at* the last pointer
    let startSearchIndex = sortedFree.findIndex(b => b.startAddress >= lastAllocPtr);
    
    // Circular search starting from last placement.
    if (startSearchIndex === -1) startSearchIndex = 0;

    // First pass: from ptr to end
    for (let i = startSearchIndex; i < sortedFree.length; i++) {
      if (sortedFree[i].length >= size) {
        targetIndex = i;
        break;
      }
    }
    
    // Second pass: from 0 to ptr (Wrap around)
    if (targetIndex === -1) {
      for (let i = 0; i < startSearchIndex; i++) {
        if (sortedFree[i].length >= size) {
          targetIndex = i;
          break;
        }
      }
    }
  }

  if (targetIndex !== -1) {
    const targetBlock = sortedFree[targetIndex];
    const newAllocated: AllocatedSpace = {
      id: generateId(),
      startAddress: targetBlock.startAddress,
      length: size,
      jobName,
      type: 'allocated'
    };

    const newFreeList = [...sortedFree];
    
    if (targetBlock.length === size) {
      newFreeList.splice(targetIndex, 1);
    } else {
      // Vital for animation: Preserve the ID of the free block so it visually "shrinks"
      // rather than being replaced by a new block.
      const remainder: FreeSpace = {
        ...targetBlock, 
        startAddress: targetBlock.startAddress + size,
        length: targetBlock.length - size,
        type: 'free'
      };
      newFreeList[targetIndex] = remainder;
    }

    return {
      success: true,
      freeList: newFreeList,
      allocatedList: [...allocatedList, newAllocated],
      lastAllocPtr: newAllocated.startAddress + size,
      message: `成功分配 ${size}B 给作业 ${jobName}`
    };
  }

  return { success: false, freeList, allocatedList, message: `内存不足: 无法分配 ${size}B` };
};

export const deallocateMemory = (
  jobName: string,
  freeList: FreeSpace[],
  allocatedList: AllocatedSpace[]
): AllocationResult => {
  const jobIndex = allocatedList.findIndex(j => j.jobName === jobName);
  
  if (jobIndex === -1) {
    return { success: false, freeList, allocatedList, message: `找不到作业: ${jobName}` };
  }

  const jobToRemove = allocatedList[jobIndex];
  const newAllocatedList = [...allocatedList];
  newAllocatedList.splice(jobIndex, 1);

  const newFreeNode: FreeSpace = {
    id: generateId(),
    startAddress: jobToRemove.startAddress,
    length: jobToRemove.length,
    type: 'free'
  };

  // Add and Coalesce
  let newFreeList = [...freeList, newFreeNode];
  newFreeList = coalesceFreeSpaces(newFreeList);

  return {
    success: true,
    freeList: newFreeList,
    allocatedList: newAllocatedList,
    message: `回收作业 ${jobName} (释放 ${jobToRemove.length}B)`
  };
};