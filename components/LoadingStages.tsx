'use client';

import { CheckCircle, Loader2 } from 'lucide-react';

interface LoadingStagesProps {
  stages: string[];
  currentStage: number;
}

export default function LoadingStages({ stages, currentStage }: LoadingStagesProps) {
  return (
    <div className="space-y-3">
      {stages.map((stage, idx) => (
        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
          idx === currentStage ? 'bg-purple-50 border-2 border-[#A29BFE]' :
          idx < currentStage ? 'bg-gray-100 border-2 border-gray-300' :
          'bg-gray-50 border-2 border-gray-100'
        }`}>
          {idx < currentStage ? (
            <CheckCircle className="w-5 h-5 text-[#6C5CE7] flex-shrink-0" />
          ) : idx === currentStage ? (
            <Loader2 className="w-5 h-5 text-[#6C5CE7] animate-spin flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
          )}
          <span className={`text-sm ${idx <= currentStage ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
            {stage}
          </span>
        </div>
      ))}
    </div>
  );
}
