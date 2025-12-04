import React, { useState, useEffect, useRef } from 'react';
import { createInitialMemory, allocateMemory, deallocateMemory, compactMemory, calculateFragmentation } from './utils/memoryLogic';
import { AllocatedSpace, FreeSpace, AlgorithmType, TOTAL_MEMORY, LogEntry, TEST_CASES, TestCase } from './types';
import { MemoryBar } from './components/MemoryBar';
import { StatsPanel } from './components/StatsPanel';
import { IntroTour, TourStep } from './components/IntroTour';
import { 
  Play, RotateCcw, Plus, Trash2, Cpu, Terminal, 
  Settings, CheckCircle2, ChevronDown, ChevronUp,
  LayoutTemplate, PieChart, Activity, BarChart3, Database,
  Zap, Turtle, Rabbit, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TOUR_STEPS: TourStep[] = [
    {
        targetId: 'center',
        title: '欢迎使用内存模拟系统',
        description: '本系统旨在直观展示操作系统中的连续内存分配算法。通过可视化的方式，您可以观察到内存块的分配、回收以及碎片的产生过程。',
        placement: 'center'
    },
    {
        targetId: 'tour-metrics',
        title: '实时监控仪表盘',
        description: '这里展示关键的性能指标：内存总使用率、外部碎片程度以及空闲块的大小分布直方图。当碎片率过高时，请留意系统建议。',
        placement: 'bottom'
    },
    {
        targetId: 'tour-algo',
        title: '选择分配策略',
        description: '支持四种经典算法：最先适应(First Fit)、最佳适应(Best Fit)、最坏适应(Worst Fit)和循环首次适应(Next Fit)。您可以随时切换算法观察不同的分配效果。',
        placement: 'right'
    },
    {
        targetId: 'tour-controls',
        title: '手动控制台',
        description: '您可以手动输入作业名称和大小进行分配，或通过作业名进行回收。新增的“整理碎片”功能可以将所有作业向低地址移动，合并空闲区。',
        placement: 'right'
    },
    {
        targetId: 'tour-viz',
        title: '可视化内存条',
        description: '这是内存的核心视图。蓝色代表已分配作业，绿色代表空闲区。您可以直观地看到每个块的位置、大小以及它们是如何被切割的。',
        placement: 'bottom'
    },
    {
        targetId: 'tour-automation',
        title: '自动化测试实验室',
        description: '为了演示作业要求，这里预置了标准测试案例。您可以调节滑块来改变运行速度，从“慢速教学模式”到“极速验证模式”。',
        placement: 'left'
    },
    {
        targetId: 'tour-logs',
        title: '系统操作日志',
        description: '所有的操作（成功或失败）都会记录在这里。日志支持悬停高亮，方便您追踪每一步的执行结果和错误原因。',
        placement: 'left'
    }
];

const App: React.FC = () => {
  // -- State --
  const [freeList, setFreeList] = useState<FreeSpace[]>([]);
  const [allocatedList, setAllocatedList] = useState<AllocatedSpace[]>([]);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('First Fit');
  const [lastAllocPtr, setLastAllocPtr] = useState(0); 
  
  // Inputs
  const [allocName, setAllocName] = useState('A');
  const [allocSize, setAllocSize] = useState<string>('1000');
  const [deallocName, setDeallocName] = useState('');

  // Simulation & Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>(TEST_CASES[0].id);
  const [isSimulating, setIsSimulating] = useState(false);
  const [delay, setDelay] = useState(800); // Speed control state (ms)
  
  // Tour State
  const [isTourOpen, setIsTourOpen] = useState(true);

  // Ref to track delay immediately inside async timeouts
  const delayRef = useRef(delay);
  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);

  // -- Initialize --
  useEffect(() => {
    resetMemory();
  }, []);

  // -- Helpers --
  const addLog = (action: LogEntry['action'], message: string, details?: string) => {
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }),
      action,
      message,
      details
    };
    setLogs(prev => [entry, ...prev].slice(0, 100));
  };

  const resetMemory = () => {
    const initial = createInitialMemory();
    setFreeList(initial.free);
    setAllocatedList(initial.allocated);
    setLastAllocPtr(0);
    setLogs([]);
    addLog('INFO', '系统初始化', `总内存: ${TOTAL_MEMORY}B`);
  };

  // -- Core Operations --

  const handleAlloc = (name: string, sizeStr: string) => {
    const size = parseInt(sizeStr);
    if (isNaN(size) || size <= 0) {
      addLog('ERROR', '无效的大小输入');
      return;
    }
    if (!name) {
      addLog('ERROR', '请输入作业名');
      return;
    }

    const result = allocateMemory(name, size, freeList, allocatedList, algorithm, lastAllocPtr);
    
    if (result.success) {
      setFreeList(result.freeList);
      setAllocatedList(result.allocatedList);
      if (result.lastAllocPtr !== undefined) setLastAllocPtr(result.lastAllocPtr);
      addLog('ALLOCATE', result.message || '分配成功', `算法: ${algorithm}`);
      
      // Auto-increment suggestion
      if (name.length === 1 && name >= 'A' && name < 'Z') {
        setAllocName(String.fromCharCode(name.charCodeAt(0) + 1));
      } else if (name.startsWith('J')) {
        const num = parseInt(name.substring(1));
        if (!isNaN(num)) setAllocName(`J${num + 1}`);
      }
    } else {
      addLog('ERROR', result.message || '分配失败');
    }
  };

  const handleDealloc = (name: string) => {
    if (!name) return;
    const result = deallocateMemory(name, freeList, allocatedList);
    
    if (result.success) {
      setFreeList(result.freeList);
      setAllocatedList(result.allocatedList);
      addLog('DEALLOCATE', result.message || '回收成功');
      setDeallocName('');
    } else {
      addLog('ERROR', result.message || '回收失败');
    }
  };

  const handleCompact = () => {
    const result = compactMemory(allocatedList);
    setAllocatedList(result.allocatedList);
    setFreeList(result.freeList);
    // Reset next fit pointer to end of allocations
    const usedMemory = result.allocatedList.reduce((acc, i) => acc + i.length, 0);
    setLastAllocPtr(usedMemory);
    
    addLog('COMPACT', '内存紧凑完成', `移动了 ${result.allocatedList.length} 个作业`);
  };

  // -- Simulation Engine --

  const stateRef = useRef({ freeList, allocatedList, lastAllocPtr, algorithm });
  useEffect(() => {
    stateRef.current = { freeList, allocatedList, lastAllocPtr, algorithm };
  }, [freeList, allocatedList, lastAllocPtr, algorithm]);

  const runSimulation = () => {
    if (isSimulating) return;
    
    const testCase = TEST_CASES.find(t => t.id === selectedTestCaseId);
    if (!testCase) return;

    setIsSimulating(true);
    resetMemory();
    addLog('INFO', `开始执行: ${testCase.name}`);
    
    // Slight delay to ensure reset propagates
    setTimeout(() => {
        processStep(0, testCase);
    }, 200);
  };

  const processStep = (index: number, testCase: TestCase) => {
    if (index >= testCase.operations.length) {
        setIsSimulating(false);
        addLog('INFO', '测试案例执行完毕');
        return;
    }

    const op = testCase.operations[index];
    const { freeList, allocatedList, lastAllocPtr, algorithm } = stateRef.current;
    
    let result;
    let logMsg = '';

    if (op.type === 'alloc') {
        result = allocateMemory(op.name!, op.size!, freeList, allocatedList, algorithm, lastAllocPtr);
        logMsg = `自动分配: ${op.name} (${op.size})`;
    } else if (op.type === 'free') {
        result = deallocateMemory(op.name!, freeList, allocatedList);
        logMsg = `自动回收: ${op.name}`;
    } else if (op.type === 'compact') {
        result = compactMemory(allocatedList);
        result = { ...result, success: true, message: '自动紧凑' }; // mimic result shape
        logMsg = `自动紧凑内存`;
    }

    // Apply result
    if (result?.success) {
        setFreeList(result.freeList);
        setAllocatedList(result.allocatedList);
        if (result.lastAllocPtr !== undefined) setLastAllocPtr(result.lastAllocPtr);
        addLog(
            op.type === 'compact' ? 'COMPACT' : op.type === 'alloc' ? 'ALLOCATE' : 'DEALLOCATE', 
            logMsg
        );
    } else {
        addLog('ERROR', `步骤 ${index+1} 失败: ${result?.message}`);
    }

    // Schedule next step (variable speed using REF)
    setTimeout(() => processStep(index + 1, testCase), delayRef.current); 
  };

  // -- Metrics --
  const totalAllocated = allocatedList.reduce((acc, curr) => acc + curr.length, 0);
  const usagePercent = ((totalAllocated / TOTAL_MEMORY) * 100).toFixed(1);
  const fragmentation = calculateFragmentation(freeList);
  const fragPercent = (fragmentation * 100).toFixed(1);

  // Distribution Metrics
  const freeBuckets = {
    tiny: freeList.filter(b => b.length < 5000).length,
    small: freeList.filter(b => b.length >= 5000 && b.length < 15000).length,
    medium: freeList.filter(b => b.length >= 15000 && b.length < 50000).length,
    large: freeList.filter(b => b.length >= 50000).length,
  };
  const maxBucketCount = Math.max(1, Math.max(...Object.values(freeBuckets)));

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 text-slate-800 font-inter overflow-hidden flex flex-col h-screen">
      
      <IntroTour 
        steps={TOUR_STEPS} 
        isOpen={isTourOpen} 
        onClose={() => setIsTourOpen(false)} 
      />

      {/* Header & Dashboard */}
      <header className="flex-none flex flex-col gap-4 mb-4">
        {/* Title Row */}
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                   <Cpu className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">内存分配算法模拟系统</h1>
                  <p className="text-slate-500 text-xs mt-1 flex items-center gap-1.5 font-medium">
                     <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                     实验10: 连续空间存储管理
                  </p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                 {/* Mini Legend */}
                <div className="hidden md:flex gap-4 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-sm"></span> 已分配
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-200 pattern-diagonal-lines rounded-sm"></span> 空闲区
                    </div>
                </div>

                {/* Help/Tour Button */}
                <button 
                  onClick={() => setIsTourOpen(true)}
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors active:scale-95"
                  title="重新播放引导"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Visual Metrics Dashboard - ID for Tour */}
        <div id="tour-metrics" className="grid grid-cols-1 md:grid-cols-3 gap-4 h-24">
            
            {/* Metric 1: Memory Usage */}
            <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center group hover:border-blue-300 hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                        <PieChart className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                        内存使用率
                    </div>
                    <span className="text-xl font-black text-slate-800 font-mono">
                        {usagePercent}%
                    </span>
                </div>
                
                <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 relative"
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            transition={{ type: "spring", stiffness: 50, damping: 15 }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] font-medium text-slate-400 font-mono">
                        <span>{totalAllocated.toLocaleString()} B 已用</span>
                        <span>{TOTAL_MEMORY.toLocaleString()} B 总计</span>
                    </div>
                </div>
            </div>

            {/* Metric 2: Fragmentation */}
            <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center group hover:border-amber-300 hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                        <Activity className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                        外部碎片率
                    </div>
                     <span className={`text-xl font-black font-mono ${fragmentation > 0.5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {fragPercent}%
                    </span>
                </div>

                <div className="space-y-1.5">
                     <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner flex relative">
                        <motion.div 
                            className={`h-full ${fragmentation > 0.5 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}
                            animate={{ width: `${fragPercent}%` }}
                            transition={{ type: "spring", stiffness: 50 }}
                        />
                     </div>
                     <div className="flex justify-between text-[10px] font-medium text-slate-400">
                        <span className={fragmentation > 0.5 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                            {fragmentation > 0.5 ? "⚠ 建议紧凑" : "✔ 状态良好"}
                        </span>
                        <span>Max Block: {Math.max(0, ...freeList.map(f => f.length)).toLocaleString()} B</span>
                    </div>
                </div>
            </div>

            {/* Metric 3: Free Space Distribution (Histogram) */}
            <div className="bg-white px-5 py-2 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-end overflow-hidden pb-1 hover:border-indigo-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 text-slate-500 font-semibold text-[10px] uppercase tracking-wider mb-1">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    空闲块分布
                </div>
                
                <div className="flex items-end justify-between h-10 gap-2 mb-1">
                    {[
                      { label: '<5K', count: freeBuckets.tiny, color: 'bg-red-400' },
                      { label: '5-15K', count: freeBuckets.small, color: 'bg-amber-400' },
                      { label: '15-50K', count: freeBuckets.medium, color: 'bg-blue-400' },
                      { label: '>50K', count: freeBuckets.large, color: 'bg-emerald-400' },
                    ].map((bucket, i) => (
                      <div key={i} className="flex flex-col items-center justify-end h-full w-full group relative">
                         <motion.div 
                           initial={{ height: 0 }}
                           animate={{ height: `${Math.max(10, (bucket.count / maxBucketCount) * 100)}%` }}
                           className={`w-full rounded-sm ${bucket.color} opacity-80 group-hover:opacity-100 transition-opacity`}
                         />
                         <div className="text-[8px] font-mono text-slate-400 mt-0.5">{bucket.label}</div>
                         <div className="absolute bottom-6 bg-slate-800 text-white text-[9px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                            {bucket.count} 个
                         </div>
                      </div>
                    ))}
                </div>
            </div>
        </div>
      </header>

      {/* Main Grid - 3 Column Layout */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-0">
        
        {/* Left Col: Controls (20%) */}
        <div className="xl:col-span-2 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
            
            {/* Algorithm Selection - ID for Tour */}
            <div id="tour-algo" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <SectionHeader icon={<Settings />} title="算法选择" />
                <div className="space-y-1.5">
                    {(['First Fit', 'Best Fit', 'Worst Fit', 'Next Fit'] as AlgorithmType[]).map((algo) => (
                        <button
                            key={algo}
                            onClick={() => setAlgorithm(algo)}
                            disabled={isSimulating}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 relative overflow-hidden group hover:scale-[1.02] active:scale-95 ${
                                algorithm === algo 
                                ? 'bg-slate-800 text-white shadow-md' 
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:shadow-sm'
                            }`}
                        >
                            <div className="relative z-10 flex justify-between items-center">
                                {algo === 'First Fit' && '最先适应'}
                                {algo === 'Best Fit' && '最佳适应'}
                                {algo === 'Worst Fit' && '最坏适应'}
                                {algo === 'Next Fit' && '循环首次'}
                                {algorithm === algo && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Manual Operations - ID for Tour */}
            <div id="tour-controls" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-5 flex-1">
                
                {/* Alloc */}
                <div>
                    <SectionHeader icon={<Plus />} title="分配" />
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <input 
                            type="text" 
                            value={allocName}
                            onChange={(e) => setAllocName(e.target.value.toUpperCase())}
                            placeholder="名" 
                            className="col-span-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-slate-100"
                        />
                        <input 
                            type="number" 
                            value={allocSize}
                            onChange={(e) => setAllocSize(e.target.value)}
                            placeholder="大小" 
                            className="col-span-2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-slate-100"
                        />
                    </div>
                    <button 
                        onClick={() => handleAlloc(allocName, allocSize)}
                        disabled={isSimulating}
                        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-200 transition-all duration-200 hover:shadow-lg hover:shadow-blue-300/50"
                    >
                        执行分配
                    </button>
                </div>

                <div className="border-t border-slate-100"></div>

                {/* Dealloc */}
                <div>
                    <SectionHeader icon={<Trash2 />} title="回收" />
                    <div className="flex gap-2 mb-2">
                        <input 
                            type="text" 
                            value={deallocName}
                            onChange={(e) => setDeallocName(e.target.value.toUpperCase())}
                            placeholder="作业名 (如 A)" 
                            className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase font-bold focus:ring-2 focus:ring-red-500 outline-none transition-all hover:bg-slate-100"
                        />
                    </div>
                    <button 
                        onClick={() => handleDealloc(deallocName)}
                        disabled={isSimulating}
                        className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 py-2 rounded-lg text-xs font-bold transition-all duration-200 hover:shadow-md"
                    >
                        执行回收
                    </button>
                </div>

                <div className="border-t border-slate-100"></div>

                {/* Compact */}
                <div>
                    <SectionHeader icon={<LayoutTemplate />} title="整理" />
                    <button 
                        onClick={handleCompact}
                        disabled={isSimulating || allocatedList.length === 0}
                        className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-md active:scale-95 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        整理碎片
                    </button>
                </div>
            </div>
        </div>

        {/* Center Col: Visuals (60%) */}
        <div className="xl:col-span-7 flex flex-col gap-4 min-h-0">
            {/* Visualization Bar - ID for Tour */}
            <div id="tour-viz" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-none transition-all hover:shadow-md duration-300">
                <SectionHeader icon={<Database />} title="内存空间可视化" />
                <MemoryBar freeList={freeList} allocatedList={allocatedList} />
            </div>

            {/* Stats Tables - Fill remaining height */}
            <div className="flex-1 min-h-0">
                <StatsPanel freeList={freeList} allocatedList={allocatedList} />
            </div>
        </div>

        {/* Right Col: Automation & Logs (20%) */}
        <div className="xl:col-span-3 flex flex-col gap-4 min-h-0">
             
             {/* Test Case Runner - ID for Tour */}
             <div id="tour-automation" className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-xl shadow-lg text-white flex-none transition-all hover:shadow-xl duration-300">
                <SectionHeader icon={<Play className="text-emerald-400" />} title="自动化测试" className="text-slate-200 mb-2" />
                
                <div className="mb-3">
                  <select 
                    value={selectedTestCaseId}
                    onChange={(e) => setSelectedTestCaseId(e.target.value)}
                    disabled={isSimulating}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 outline-none focus:border-emerald-500 transition-colors hover:bg-slate-700 cursor-pointer"
                  >
                    {TEST_CASES.map(tc => (
                      <option key={tc.id} value={tc.id}>{tc.name}</option>
                    ))}
                  </select>
                </div>

                {/* Speed Control */}
                <div className="mb-3 px-1">
                   <div className="flex justify-between text-[9px] text-slate-400 mb-1.5 font-medium uppercase tracking-wider">
                      <span className="flex items-center gap-1">慢 <Turtle className="w-3 h-3" /></span>
                      <span className="text-emerald-400 font-mono">{(1600 - delay)} speed</span>
                      <span className="flex items-center gap-1"><Rabbit className="w-3 h-3" /> 快</span>
                   </div>
                   <input
                      type="range"
                      min="100"
                      max="1500"
                      step="100"
                      value={1600 - delay} // Right (1500) = Fast (delay 100). Left (100) = Slow (delay 1500).
                      onChange={(e) => setDelay(1600 - parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={runSimulation}
                        disabled={isSimulating}
                        className={`col-span-2 ${isSimulating ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/20'} py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 hover:shadow-emerald-500/30`}
                    >
                        {isSimulating ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        {isSimulating ? '执行中...' : '开始运行'}
                    </button>
                    <button 
                        onClick={resetMemory}
                        disabled={isSimulating}
                        className="col-span-2 bg-white/10 hover:bg-white/20 text-slate-200 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <RotateCcw className="w-3 h-3" /> 重置系统
                    </button>
                 </div>
            </div>

            {/* Logs Panel - ID for Tour */}
            <div id="tour-logs" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 transition-all hover:shadow-md duration-300">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-none">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">系统操作日志</span>
                    </div>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded-full">{logs.length}</span>
                </div>
                
                <div className="flex-1 overflow-hidden bg-slate-900">
                    <div className="h-full overflow-y-auto p-3 font-mono text-[11px] space-y-1 custom-scrollbar">
                        {logs.length === 0 && <div className="text-slate-600 italic text-center py-10">暂无日志...</div>}
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-2 border-l-2 border-slate-700 pl-2 py-0.5 hover:bg-white/10 hover:scale-[1.02] origin-left transition-all duration-200 rounded-r cursor-default">
                                <span className="text-slate-600 shrink-0 select-none">{log.timestamp.split(' ')[0]}</span>
                                <span className={`font-bold shrink-0 
                                    ${log.action === 'ALLOCATE' ? 'text-blue-400' : ''}
                                    ${log.action === 'DEALLOCATE' ? 'text-emerald-400' : ''}
                                    ${log.action === 'COMPACT' ? 'text-indigo-400' : ''}
                                    ${log.action === 'ERROR' ? 'text-red-400' : ''}
                                    ${log.action === 'INFO' ? 'text-amber-400' : ''}
                                `}>
                                    [{log.action.substring(0,4)}]
                                </span>
                                <span className="text-slate-300 break-all">{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

const SectionHeader = ({ icon, title, className = 'text-slate-400' }: { icon: React.ReactNode, title: string, className?: string }) => (
    <h2 className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${className}`}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
        {title}
    </h2>
);

export default App;