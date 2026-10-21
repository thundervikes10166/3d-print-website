import React from 'react';
import { useLab } from '../context/LabContext';
import { X, CheckCircle2, Clock, PlayCircle, PackageCheck, AlertCircle, FileText } from 'lucide-react';
import { RequestStatus } from '../types';

export const STATUS_DEFINITIONS: Record<
  string,
  { label: string; description: string; step: number; badgeColor: string }
> = {
  submitted: {
    label: 'Submitted / Requested',
    description:
      'The custom CAD ticket or catalog print request has been saved in Firestore and is queued for lab review.',
    step: 1,
    badgeColor: 'bg-red-50 text-red-800 border-red-200',
  },
  underReview: {
    label: 'Under Review',
    description:
      'A student maker or lab teacher is reviewing the 3D geometry in slicing software (Cura/PrusaSlicer) for safety and overhang tolerances.',
    step: 2,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  accepted: {
    label: 'Accepted',
    description:
      'The model has passed CAD inspection. Filament is reserved and the G-code is staged on the SD card / OctoPrint.',
    step: 3,
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  inProduction: {
    label: 'In Production',
    description:
      'The 3D printer is actively extruding the part on the heated build plate in Room Q10.',
    step: 4,
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  ready: {
    label: 'Ready for Pickup',
    description:
      'Print finished, cooled, and removed from the print bed. Placed on the Room Q10 fabrication shelf at Hueneme High.',
    step: 5,
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  completed: {
    label: 'Completed',
    description:
      'The requester has picked up their 3D part and verified fitment for robotics/class use.',
    step: 6,
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  declined: {
    label: 'Declined / Re-slice Required',
    description:
      'The model was declined due to unprintable geometry, non-school-safe design, or unavailable filament.',
    step: 0,
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export const StatusSystemGuideModal: React.FC = () => {
  const { showStatusModal, setShowStatusModal } = useLab();

  if (!showStatusModal) return null;

  const getStatusIcon = (statusKey: string) => {
    switch (statusKey) {
      case 'submitted':
        return <FileText className="w-4 h-4 text-red-600" />;
      case 'underReview':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'accepted':
        return <CheckCircle2 className="w-4 h-4 text-purple-600" />;
      case 'inProduction':
        return <PlayCircle className="w-4 h-4 text-indigo-600" />;
      case 'ready':
        return <PackageCheck className="w-4 h-4 text-emerald-600" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-slate-500" />;
      case 'declined':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const statusSteps = ['submitted', 'underReview', 'accepted', 'inProduction', 'ready', 'completed'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold uppercase tracking-tight">3D Print Request & Order Lifecycle</h3>
            <p className="text-xs text-slate-300 font-normal">
              Standard operating procedure for school robotics & coding print lab requests
            </p>
          </div>
          <button
            onClick={() => setShowStatusModal(false)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Visual Step Sequence */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
            {statusSteps.map((key, index) => {
              const def = STATUS_DEFINITIONS[key];
              return (
                <div
                  key={key}
                  className="bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-col items-center justify-between text-left sm:text-center"
                >
                  <div className="w-6 h-6 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center mb-1.5">
                    0{index + 1}
                  </div>
                  <div className="font-bold text-[10px] uppercase font-mono text-slate-900 leading-tight mb-1">
                    {key}
                  </div>
                  <div className="mt-1">{getStatusIcon(key)}</div>
                </div>
              );
            })}
          </div>

          {/* Detailed explanations */}
          <div className="space-y-3 divide-y divide-slate-200 font-normal">
            {Object.entries(STATUS_DEFINITIONS).map(([key, details]) => (
              <div key={key} className="pt-3 first:pt-0 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{getStatusIcon(key)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${details.badgeColor}`}
                    >
                      {details.label}
                    </span>
                    {details.step > 0 && (
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                        STEP {details.step} OF 6
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal">{details.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Lab note */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded text-xs text-slate-900 leading-relaxed font-normal">
            <strong className="font-bold uppercase font-mono text-[11px]">Classroom Quality & Safety Check:</strong> All models are reviewed by the student maker and teacher for structural integrity, bed adhesion safety, and appropriate non-hazardous geometry before printing commences in Room 204.
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => setShowStatusModal(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
