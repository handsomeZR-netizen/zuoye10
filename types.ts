export type AlgorithmType = 'First Fit' | 'Best Fit' | 'Worst Fit' | 'Next Fit';

export interface FreeSpace {
  id: string;
  startAddress: number;
  length: number;
  type: 'free';
}

export interface AllocatedSpace {
  id: string;
  startAddress: number;
  length: number;
  jobName: string;
  type: 'allocated';
}

export type MemoryBlock = FreeSpace | AllocatedSpace;

export interface LogEntry {
  id: number;
  timestamp: string;
  action: 'ALLOCATE' | 'DEALLOCATE' | 'COMPACT' | 'ERROR' | 'INFO';
  message: string;
  details?: string;
}

export const TOTAL_MEMORY = 100000;

export interface Operation {
  type: 'alloc' | 'free' | 'compact';
  name?: string;
  size?: number;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  operations: Operation[];
}

export const TEST_CASES: TestCase[] = [
  {
    id: 'teacher',
    name: '实验10 标准作业',
    description: '老师布置的标准实验案例，测试基本的分配与回收逻辑。',
    operations: [
      { type: 'alloc', name: 'A', size: 3000 },
      { type: 'alloc', name: 'B', size: 3000 },
      { type: 'alloc', name: 'C', size: 5000 },
      { type: 'alloc', name: 'D', size: 15000 },
      { type: 'alloc', name: 'E', size: 2000 },
      { type: 'free', name: 'B' }, // Creates hole 3000
      { type: 'alloc', name: 'F', size: 4000 }, // Needs 4000
      { type: 'free', name: 'E' },
      { type: 'alloc', name: 'H', size: 90000 }, // Intentionally likely to fail
      { type: 'alloc', name: 'G', size: 1500 },
      { type: 'free', name: 'D' },
      { type: 'free', name: 'G' },
      { type: 'free', name: 'A' },
    ]
  },
  {
    id: 'fragmentation',
    name: '内存碎片与紧凑测试',
    description: '制造大量外部碎片，演示大作业无法分配，随后使用“内存紧凑”解决问题。',
    operations: [
      { type: 'alloc', name: 'J1', size: 10000 },
      { type: 'alloc', name: 'J2', size: 10000 },
      { type: 'alloc', name: 'J3', size: 10000 },
      { type: 'alloc', name: 'J4', size: 10000 },
      { type: 'alloc', name: 'J5', size: 10000 },
      { type: 'free', name: 'J2' }, // Hole 10000 at 10000
      { type: 'free', name: 'J4' }, // Hole 10000 at 30000
      // Total Free: 60000 (Initial 50k + 10k + 10k). Max Contig: 50000 (at end).
      // Let's create more mess.
      { type: 'alloc', name: 'K1', size: 45000 }, // Takes the end chunk
      // Now we have hole at 10000 (10k) and 30000 (10k) and end (5k).
      // Total Free: 25k. Max Block: 10k.
      { type: 'alloc', name: 'BIG', size: 15000 }, // Should FAIL due to fragmentation
      { type: 'compact' }, // Merge all memory
      { type: 'alloc', name: 'BIG', size: 15000 }, // Should SUCCESS
    ]
  }
];