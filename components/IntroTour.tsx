import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface IntroTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
}

export const IntroTour: React.FC<IntroTourProps> = ({ steps, isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Calculate smart position that stays within viewport
  const calculatePosition = (placement: string | undefined, rect: DOMRect | null) => {
    if (!rect) {
      return { top: '50%', left: '50%', x: '-50%', y: '-50%' };
    }

    const cardWidth = 384; // max-w-sm = 24rem = 384px
    const cardHeight = 300; // approximate height
    const gap = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top: number | string = 'auto';
    let left: number | string = 'auto';
    let x = 0;
    let y = 0;

    switch (placement) {
      case 'bottom':
        top = rect.bottom + gap;
        left = Math.max(gap, Math.min(rect.left, viewportWidth - cardWidth - gap));
        // Fallback to top if no space below
        if (top + cardHeight > viewportHeight - gap) {
          top = Math.max(gap, rect.top - cardHeight - gap);
        }
        break;

      case 'top':
        top = Math.max(gap, rect.top - cardHeight - gap);
        left = Math.max(gap, Math.min(rect.left, viewportWidth - cardWidth - gap));
        // Fallback to bottom if no space above
        if (top < gap) {
          top = rect.bottom + gap;
        }
        break;

      case 'right':
        top = Math.max(gap, Math.min(rect.top, viewportHeight - cardHeight - gap));
        left = rect.right + gap;
        // Fallback to left if no space on right
        if (left + cardWidth > viewportWidth - gap) {
          left = Math.max(gap, rect.left - cardWidth - gap);
        }
        break;

      case 'left':
        top = Math.max(gap, Math.min(rect.top, viewportHeight - cardHeight - gap));
        left = Math.max(gap, rect.left - cardWidth - gap);
        // Fallback to right if no space on left
        if (left < gap) {
          left = rect.right + gap;
        }
        break;

      default:
        // Center on target
        top = Math.max(gap, Math.min(rect.top, viewportHeight - cardHeight - gap));
        left = Math.max(gap, Math.min(rect.left, viewportWidth - cardWidth - gap));
    }

    return { top, left, x, y };
  };

  // Helper to update rect based on current step ID
  const updateRect = useCallback(() => {
    if (!isOpen) return;
    
    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;
    
    // Special case for 'center' placement or missing ID
    if (currentStep.targetId === 'center') {
      setTargetRect(null); // No spotlight for center welcome screen
      return;
    }

    const element = document.getElementById(currentStep.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      // Add some padding
      const padding = 8;
      setTargetRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + (padding * 2),
        height: rect.height + (padding * 2),
        bottom: rect.bottom + padding,
        right: rect.right + padding,
        x: rect.x - padding,
        y: rect.y - padding,
        toJSON: () => {}
      });
    } else {
      // Element not found, fallback to null
      setTargetRect(null);
    }
  }, [currentStepIndex, isOpen, steps]);

  // Update rect when step changes
  useEffect(() => {
    updateRect();
  }, [currentStepIndex, updateRect]);

  // Listen for resize and scroll to keep spotlight updated
  useEffect(() => {
    const handleUpdate = () => updateRect();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [updateRect]);

  // Reset to step 0 when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];
  const isCenter = !targetRect;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] overflow-hidden">
        
        {/* Spotlight Overlay */}
        {targetRect ? (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 pointer-events-none"
             // We animate the position of this div to match the target
             transition={{ type: "spring", stiffness: 200, damping: 25 }}
             layoutId="spotlight-box"
             style={{
                // Massive box shadow to create the dark overlay with a hole
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
                borderRadius: 12, // Match UI rounded corners
                position: 'absolute'
             }}
           />
        ) : (
            // Full screen overlay for center steps
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
        )}

        {/* Info Card */}
        <div className="absolute inset-0 w-full h-full pointer-events-none flex flex-col">
            <motion.div
                className="pointer-events-auto absolute bg-white/95 backdrop-blur p-6 rounded-2xl shadow-2xl border border-white/20 max-w-sm w-full z-50"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ 
                    opacity: 1, 
                    scale: 1,
                    ...calculatePosition(currentStep.placement, targetRect)
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {/* Step Indicator */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 uppercase tracking-wider">
                        Step {currentStepIndex + 1} / {steps.length}
                    </span>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-slate-800 mb-2">{currentStep.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {currentStep.description}
                </p>

                {/* Controls */}
                <div className="flex items-center justify-between">
                     <div className="flex gap-1">
                        {steps.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentStepIndex ? 'bg-blue-500' : 'bg-slate-200'}`}
                            />
                        ))}
                     </div>

                     <div className="flex gap-3">
                         {currentStepIndex > 0 && (
                             <button 
                                onClick={handlePrev}
                                className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
                             >
                                <ChevronLeft className="w-4 h-4" /> Back
                             </button>
                         )}
                         <button 
                            onClick={handleNext}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 flex items-center gap-1.5 transition-all active:scale-95"
                         >
                            {currentStepIndex === steps.length - 1 ? (
                                <>Finish <Check className="w-4 h-4" /></>
                            ) : (
                                <>Next <ChevronRight className="w-4 h-4" /></>
                            )}
                         </button>
                     </div>
                </div>
            </motion.div>
        </div>

      </div>
    </AnimatePresence>
  );
};