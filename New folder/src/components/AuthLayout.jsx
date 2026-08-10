import React from "react";
import { Tent } from "lucide-react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" dir="rtl">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative text-center text-white">
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Tent className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-2">ריטריט כנרת</h2>
          <p className="text-emerald-50/80 text-sm max-w-xs mx-auto leading-relaxed">
            ניהול אירועים קהילתיים — רשימות קניות, תוכנית אמנותית, הוצאות והגעות, הכל במקום אחד.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-stone-50 px-5 py-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-3 shadow-sm">
              <Tent className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-stone-800">ריטריט כנרת</h2>
          </div>

          <div className="text-center mb-8">
            {Icon && (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 mb-3">
                <Icon className="w-6 h-6 text-emerald-600" aria-hidden="true" />
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">{title}</h1>
            {subtitle && <p className="text-stone-500 mt-1.5 text-sm">{subtitle}</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 sm:p-7">
            {children}
          </div>

          {footer && (
            <p className="text-center text-sm text-stone-500 mt-5">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}