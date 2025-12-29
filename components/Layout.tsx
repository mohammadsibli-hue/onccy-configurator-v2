import React, { useEffect, useState } from 'react';
import { Settings, User, ArrowRight, LogOut, Menu, X, Zap } from 'lucide-react';
import { User as UserType, AppSettings } from '../types';
import { t } from '../i18n';
import { StorageService } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'configurator' | 'admin' | 'login';
  onNavigate: (page: 'configurator' | 'admin' | 'login') => void;
  currentUser: UserType | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentPage, 
  onNavigate, 
  currentUser,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    try {
      StorageService.init();
      setSettings(StorageService.getSettings());
    } catch (e) {
      // ignore, fallback to default logo
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-200/80">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mt-4 mb-4 flex justify-between items-center h-16 sm:h-18 rounded-full bg-[#e9f0ff]/95 border border-white/60 shadow-[0_18px_45px_rgba(15,23,42,0.38)] backdrop-blur-xl px-4 sm:px-6">
            {/* Logo - configurable via AppSettings.logoUrl, fallback to KINRED style */}
            <div className="flex items-center cursor-pointer group" onClick={() => onNavigate('configurator')}>
              {settings?.logoUrl ? (
                <div className="flex items-center select-none transform group-hover:scale-105 transition-transform duration-200">
                  <div className="h-10 px-4 rounded-full bg-[#e9f0ff] border border-white/60 shadow-sm flex items-center justify-center overflow-hidden">
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="h-7 w-auto object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center select-none transform group-hover:scale-105 transition-transform duration-200">
                  <span className="text-4xl font-black tracking-tighter text-[#00348a] flex items-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                    KINRE
                  </span>
                  <div className="relative flex items-center justify-center h-[42px] w-[48px] bg-[#e31e24] rounded-r-[24px] ml-[2px]">
                      <Zap className="w-7 h-7 text-white fill-white -ml-0.5" strokeWidth={2} />
                  </div>
                </div>
              )}
            </div>
            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8 items-center">
              <button 
                onClick={() => onNavigate('configurator')}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'configurator' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.nav.configurator}
              </button>
              
              {currentUser ? (
                <>
                  <button 
                    onClick={() => onNavigate('admin')}
                    className={`text-sm font-medium flex items-center transition-colors ${
                      currentPage === 'admin' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-1.5" />
                    {t.nav.adminDashboard}
                  </button>
                  <div className="flex items-center text-sm font-medium text-slate-400 px-2">
                     <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs mr-2">
                        {currentUser.username}
                     </span>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="text-sm font-medium text-slate-600 hover:text-red-600 flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    {t.nav.logout}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => onNavigate('login')}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center"
                >
                  <User className="w-4 h-4 mr-1.5" />
                  {t.nav.internalLogin}
                </button>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-600 hover:text-slate-900 p-2"
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 py-2">
            <div className="px-4 space-y-2">
               <button 
                onClick={() => { onNavigate('configurator'); setMobileMenuOpen(false); }}
                className="block w-full text-left py-2 text-base font-medium text-slate-700"
              >
                {t.nav.configurator}
              </button>
              {currentUser ? (
                <>
                  <button 
                    onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 text-base font-medium text-slate-700"
                  >
                    {t.nav.adminDashboard}
                  </button>
                  <div className="py-2 text-sm text-slate-500">
                     {t.nav.loggedInAs} {currentUser.username}
                  </div>
                  <button 
                    onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 text-base font-medium text-red-600"
                  >
                    {t.nav.logout}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 text-base font-medium text-slate-700"
                >
                  {t.nav.internalLogin}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Christmas banner (configurator only) */}
      {currentPage === 'configurator' && (
        <div className="bg-gradient-to-r from-[#0f172a] via-[#1d4ed8] to-[#0f172a] shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-[11px] text-slate-100">
            <span className="font-semibold tracking-[0.2em] uppercase">Configurator Mode</span>
            <span className="flex items-center gap-2 text-[10px]">
              <span className="inline-flex h-5 w-5 rounded-full border border-slate-100/70 bg-blue-500/80"></span>
              <span className="inline-flex h-5 w-5 rounded-full border border-slate-100/70 bg-emerald-500/80"></span>
              <span className="inline-flex h-5 w-5 rounded-full border border-slate-100/70 bg-amber-400/90"></span>
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
          <p className="text-sm">{t.footer.copyright}</p>
          <p className="text-xs text-slate-500">
            {settings?.companyName || 'KINRED'}
          </p>
        </div>
      </footer>
    </div>
  );
};