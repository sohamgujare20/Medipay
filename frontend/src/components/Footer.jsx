import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full py-5 px-8 bg-gray-50/50 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-gray-500 relative z-40 mt-auto">
      <div>
        &copy; {new Date().getFullYear()} <span className="font-black text-gray-700">MediPay</span> Point of Sale.
      </div>
      <div className="flex items-center gap-4 mt-3 sm:mt-0">
        <a href="#" className="hover:text-teal-600 transition-colors font-bold">Support</a>
        <a href="#" className="hover:text-teal-600 transition-colors font-bold">Privacy</a>
        <a href="#" className="hover:text-teal-600 transition-colors font-bold">Terms</a>
        <span className="px-2 py-0.5 rounded bg-gray-200/80 text-gray-600 font-bold text-[10px] tracking-widest uppercase">v2.1.0</span>
      </div>
    </footer>
  );
}
