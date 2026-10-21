import React from 'react';
import { useLab } from '../context/LabContext';
import { ProductCard } from './ProductCard';
import { 
  ArrowLeft, 
  Printer, 
  Clock, 
  Shield, 
  Award, 
  PlusCircle, 
  CheckCircle2, 
  Cpu, 
  Box, 
  Sparkles,
  Lock
} from 'lucide-react';

export const StudentMakerProfileView: React.FC = () => {
  const { selectedMakerId, listings, navigateTo } = useLab();

  const makerCreations = listings.filter(
    (p) =>
      (p.creatorId === selectedMakerId || p.makerId === selectedMakerId) &&
      p.status === 'published'
  );

  const makerName =
    makerCreations[0]?.creatorDisplayName ||
    makerCreations[0]?.makerName ||
    'Student Maker';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Back button */}
      <div>
        <button
          onClick={() => navigateTo('marketplace')}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
      </div>

      {/* Maker Profile Header Card */}
      <div className="bg-slate-900 text-white rounded p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded bg-red-600/20 border-2 border-red-500/50 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shrink-0 font-mono">
              {makerName.charAt(0)}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white">
                  {makerName}
                </h1>
                <span className="px-2.5 py-0.5 rounded bg-red-600/20 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  VERIFIED_STUDENT_MAKER
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-300 font-mono uppercase">
                Hueneme High • Room Q10 Fabrication Team
              </div>

              <p className="text-xs text-slate-300 max-w-xl leading-relaxed pt-1 font-normal">
                Student CAD designer and 3D printing operator contributing verified functional parts and custom classroom models.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto">
            <button
              onClick={() => navigateTo('custom_request')}
              className="px-4 py-2.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Request Custom Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Maker's Published Creations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
              Creations by {makerName}
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Published and verified models available in Firestore
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            {makerCreations.length} PUBLISHED_DESIGNS
          </span>
        </div>

        {makerCreations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {makerCreations.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded border border-slate-200 p-6">
            <Box className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-extrabold uppercase tracking-tight text-slate-800">No active public designs right now</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-normal">
              This maker does not have any active approved listings in Firestore yet.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
