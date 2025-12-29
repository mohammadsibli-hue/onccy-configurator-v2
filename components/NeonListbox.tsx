import React from 'react';

interface NeonListboxOption {
  id: string;
  label: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

interface NeonListboxProps {
  label?: string;
  placeholder?: string;
  options: NeonListboxOption[];
  value: string | null;
  onChange: (id: string) => void;
}

export const NeonListbox: React.FC<NeonListboxProps> = ({
  label,
  placeholder = 'Select...',
  options,
  value,
  onChange,
}) => {
  const selected = options.find(o => o.id === value) || null;

  return (
    <div className="inline-flex flex-col items-stretch">
      {label && (
        <div className="mb-2 text-xs font-medium tracking-[0.12em] uppercase text-slate-500 text-center">
          {label}
        </div>
      )}

      <div className="relative">
        <div className="mx-auto w-[280px] sm:w-[320px] rounded-full bg-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.35)] border border-slate-300 px-5 py-3 flex items-center justify-between text-sm font-medium text-slate-800">
          <span>{selected ? selected.label : placeholder}</span>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-500 text-slate-700 text-xs">
            ˅
          </span>
        </div>

        <div className="mx-auto mt-4 w-[280px] sm:w-[320px] rounded-[26px] bg-emerald-400/60 border border-emerald-300 shadow-[0_0_40px_rgba(34,197,94,0.75)] backdrop-blur-xl px-3 pt-3 pb-4 relative">
          <div className="absolute inset-x-3 top-[18px] bottom-[22px] pointer-events-none opacity-40 bg-[radial-gradient(circle_at_0_0,#bbf7d0,transparent_55%),radial-gradient(circle_at_100%_0,#6ee7b7,transparent_55%)]"></div>

          <div className="relative space-y-2">
            {options.map((opt, index) => {
              const isActive = opt.id === selected?.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange(opt.id)}
                  className={`w-full flex items-center justify-between rounded-full px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.9)]'
                      : 'bg-emerald-300/40 text-emerald-950 hover:bg-emerald-300/70 hover:shadow-[0_0_22px_rgba(52,211,153,0.9)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full border text-xs ${
                      isActive
                        ? 'bg-white/10 border-white text-white'
                        : 'bg-emerald-200/60 border-emerald-100 text-emerald-800'
                    }`}
                    >
                      {opt.leftIcon ?? '⦿'}
                    </div>
                    <span className="truncate max-w-[140px] sm:max-w-[170px] text-left">
                      {opt.label}
                    </span>
                  </div>
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full border text-[11px] ${
                    isActive
                      ? 'border-white text-white bg-white/10'
                      : 'border-emerald-100 text-emerald-900 bg-emerald-50/40'
                  }`}
                  >
                    {opt.rightIcon ?? (index === 1 ? '✓' : '˅')}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 mx-auto inline-flex items-center justify-center rounded-full bg-emerald-900/90 text-emerald-100 text-[11px] px-4 py-1 shadow-inner border border-emerald-700">
            listbox only — no card
          </div>
        </div>
      </div>
    </div>
  );
};
