// Shared Tailwind class names, so buttons and fields look the same everywhere.
// Sizes follow mobile guidelines: tap targets at least 44px tall, and text in
// form fields at 16px (smaller text makes iPhones zoom the page when you tap a field).

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300";

export const primaryButton = `inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-500 px-5 text-base font-semibold text-white transition hover:bg-indigo-400 active:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const secondaryButton = `inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-600 px-5 text-base font-semibold text-slate-100 transition hover:bg-slate-800 active:bg-slate-700 ${focusRing}`;

export const navButton = `inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 active:bg-slate-700 ${focusRing}`;

export const inputField = `block min-h-12 w-full rounded-xl border bg-slate-800 px-4 text-base text-slate-100 placeholder:text-slate-500 focus:outline-2 focus:outline-offset-0 focus:outline-indigo-400/50`;

export const textLink = "font-medium text-indigo-300 underline-offset-4 hover:underline";

// Forms and cards stay a comfortable width even on a big screen.
export const narrow = "mx-auto w-full max-w-sm";
