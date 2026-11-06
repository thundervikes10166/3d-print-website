import React from 'react';
import { CAD_STAGES, requestStageIndex } from '../lib/requestWorkflow';
import { RequestStatus } from '../types';

interface RequestPipelineProps {
  status: RequestStatus;
}

export const RequestPipeline: React.FC<RequestPipelineProps> = ({ status }) => {
  const currentIndex = requestStageIndex(status);
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" aria-label="CAD request progress">
      {CAD_STAGES.map((stage, index) => {
        const done = currentIndex > index;
        const current = currentIndex === index;
        return (
          <li
            key={stage.status}
            aria-current={current ? 'step' : undefined}
            className={`rounded border px-2.5 py-3 text-left min-h-[79px] ${
              current ? 'bg-red-50 border-[#C41E3A] text-[#99162D]' :
              done ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
              'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider">
              {done ? '✓ Done' : current ? '● Current' : `Step ${index + 1}`}
            </div>
            <div className="mt-1 text-xs font-extrabold leading-tight">{stage.label}</div>
            <div className="mt-1 text-[10px] leading-snug">{stage.detail}</div>
          </li>
        );
      })}
    </ol>
  );
};
