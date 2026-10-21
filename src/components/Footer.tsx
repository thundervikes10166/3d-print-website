import React from 'react';
import { useLab } from '../context/LabContext';
import { Shield, MapPin, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigateTo, setShowStatusModal, isConfigured } = useLab();

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Brand & Purpose */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5 text-white font-extrabold uppercase tracking-tight text-sm">
              <img
                src="/hueneme-viking-crest.svg"
                alt="Hueneme High School Logo"
                className="h-6 w-6 object-contain"
                referrerPolicy="no-referrer"
              />
              <span>Hueneme High School 3D Print Lab</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md font-normal">
              A collaborative student fabrication portal for Hueneme High School (Oxnard, CA), where robotics team members and coding students showcase CAD designs, fabricate custom mechanical components, and process print requests for teachers and school projects.
            </p>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              {isConfigured ? 'FIREBASE DATA SYNC ENABLED' : 'LOCAL PREVIEW: FIREBASE NOT CONFIGURED'}
            </div>
          </div>

          {/* Col 2: Lab Location & Operating Hours */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-200 font-bold">
              LAB_OPERATIONS
            </div>
            <div className="space-y-1.5 text-xs text-slate-400 font-normal">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>Hueneme High School • Room Q10 (Oxnard, CA)</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>Fabrication Hours: Mon - Thu, 3:30 - 5:00 PM</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>Supervised by Robotics & Coding Instructor</span>
              </div>
            </div>
          </div>

          {/* Col 3: Portal Navigation */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-200 font-bold">
              PORTAL_VIEWS
            </div>
            <div className="flex flex-col space-y-1.5 text-xs font-medium">
              <button
                onClick={() => navigateTo('marketplace')}
                className="text-left text-slate-400 hover:text-white transition-colors"
              >
                Browse 3D Catalog
              </button>
              <button
                onClick={() => navigateTo('custom_request')}
                className="text-left text-slate-400 hover:text-white transition-colors"
              >
                Request Custom Print
              </button>
              <button
                onClick={() => navigateTo('my_requests')}
                className="text-left text-slate-400 hover:text-white transition-colors"
              >
                Order Status Tracker
              </button>
              <button
                onClick={() => navigateTo('student_dashboard')}
                className="text-left text-slate-400 hover:text-white transition-colors"
              >
                Student Maker Dashboard
              </button>
              <button
                onClick={() => navigateTo('teacher_dashboard')}
                className="text-left text-slate-400 hover:text-white transition-colors"
              >
                Teacher Admin Console
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-slate-500 uppercase font-medium">
          <div>
            School Digital Fabrication & 3D Prototyping Initiative • Non-Commercial Classroom Service
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowStatusModal(true)}
              className="hover:text-slate-300 transition-colors uppercase font-bold"
            >
              Order Status Definitions
            </button>
            <span>•</span>
            <span>Zero Fake Data Enforced</span>
            <span>•</span>
            <span>Real Cloud Firestore Sync</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
