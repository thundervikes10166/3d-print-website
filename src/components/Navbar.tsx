import React, { useState } from 'react';
import { useLab } from '../context/LabContext';
import {
  Printer,
  Search,
  User,
  LogOut,
  LogIn,
  Layers,
  FileText,
  ShieldCheck,
  PlusCircle,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { ActiveView } from '../types';

export const Navbar: React.FC = () => {
  const {
    activeView,
    navigateTo,
    currentUser,
    userProfile,
    classStudents,
    isAdminWhitelisted,
    logout,
    setShowAuthModal,
    setAuthModalMode,
    setShowStatusModal,
  } = useLab();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const handleNav = (view: ActiveView) => {
    navigateTo(view);
    setMobileMenuOpen(false);
  };

  const isClassStudent = Boolean(
    currentUser?.email &&
      classStudents.some(
        (student) => student.email?.trim().toLowerCase() === currentUser.email?.trim().toLowerCase()
      )
  );
  const roleLabel = isAdminWhitelisted ? 'Admin' : isClassStudent ? 'Student' : 'Buyer';

  return (
    <nav className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center">
            <button
              id="btn-brand-home"
              onClick={() => handleNav('marketplace')}
              className="flex items-center group py-1"
              aria-label="Hueneme High School"
            >
              <img
                src="/hueneme-high-logo.svg"
                alt="Hueneme High School"
                className="h-8 sm:h-10 w-auto object-contain group-hover:opacity-90 transition-opacity"
                referrerPolicy="no-referrer"
              />
            </button>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => handleNav('marketplace')}
              className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                activeView === 'marketplace'
                  ? 'bg-[#C41E3A] text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
                Shop
            </button>

            <button
              onClick={() => handleNav('custom_request')}
              className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                activeView === 'custom_request'
                  ? 'bg-[#C41E3A] text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
                Request
            </button>

            {currentUser && (
              <>
                <button
                  onClick={() => handleNav('student_dashboard')}
                  className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                    activeView === 'student_dashboard'
                      ? 'bg-[#C41E3A] text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Workbench
                </button>

                <button
                  onClick={() => handleNav('my_requests')}
                  className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                    activeView === 'my_requests'
                      ? 'bg-[#C41E3A] text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Orders
                </button>
              </>
            )}

            <button
              onClick={() => handleNav('teacher_dashboard')}
              className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                activeView === 'teacher_dashboard'
                  ? 'bg-[#C41E3A] text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Admin
            </button>
          </div>

          {/* Right Action / Auth */}
          <div className="hidden md:flex items-center gap-3">
            
            <button
              onClick={() => setShowStatusModal(true)}
              className="text-[11px] font-mono uppercase text-slate-400 hover:text-white font-bold transition-colors"
            >
              Status
            </button>

            {currentUser ? (
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="pl-3 border-l border-slate-800 text-[11px] text-red-300 hover:text-white transition-colors"
                aria-expanded={accountMenuOpen}
              >
                Role: {roleLabel}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setShowAuthModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors border border-slate-700"
                >
                  Sign In
                </button>

                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="px-3 py-1.5 bg-[#C41E3A] hover:bg-[#A0182E] text-white rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {currentUser && (
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="text-[11px] text-red-300 hover:text-white transition-colors"
                aria-expanded={accountMenuOpen}
              >
                Role: {roleLabel}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {currentUser && accountMenuOpen && (
        <div className="absolute right-4 sm:right-6 lg:right-8 top-14 sm:top-16 z-50 w-64 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <div className="truncate text-sm font-semibold text-white">
              {userProfile?.displayName || currentUser.displayName || 'Student'}
            </div>
            <div className="truncate text-xs text-slate-400 mt-1">{currentUser.email}</div>
            <div className="text-xs text-red-300 mt-1">Role: {roleLabel}</div>
          </div>
          <button
            onClick={() => {
              logout();
              setAccountMenuOpen(false);
              setMobileMenuOpen(false);
            }}
            className="mt-3 flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs font-semibold text-rose-300 hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => handleNav('marketplace')}
              className="text-left px-3 py-2 rounded text-xs font-mono font-bold uppercase text-slate-300 hover:text-white hover:bg-slate-900"
            >
              Marketplace
            </button>
            <button
              onClick={() => handleNav('custom_request')}
              className="text-left px-3 py-2 rounded text-xs font-mono font-bold uppercase text-slate-300 hover:text-white hover:bg-slate-900"
            >
              Request
            </button>
            {currentUser && (
              <>
                <button
                  onClick={() => handleNav('student_dashboard')}
                  className="text-left px-3 py-2 rounded text-xs font-mono font-bold uppercase text-slate-300 hover:text-white hover:bg-slate-900"
                >
                  Workbench
                </button>
                <button
                  onClick={() => handleNav('my_requests')}
                  className="text-left px-3 py-2 rounded text-xs font-mono font-bold uppercase text-slate-300 hover:text-white hover:bg-slate-900"
                >
                  Orders
                </button>
              </>
            )}
            <button
              onClick={() => handleNav('teacher_dashboard')}
              className="text-left px-3 py-2 rounded text-xs font-mono font-bold uppercase text-red-400 hover:bg-slate-900"
            >
              Admin
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800">
            {!currentUser && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setShowAuthModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-1/2 py-2 bg-slate-800 text-white rounded text-xs font-mono font-bold uppercase text-center"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setShowAuthModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-1/2 py-2 bg-red-600 text-white rounded text-xs font-mono font-bold uppercase text-center"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
