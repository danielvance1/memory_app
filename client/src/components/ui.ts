// Shared Tailwind class names, so buttons and fields look the same everywhere.
// Sizes follow mobile guidelines: tap targets at least 44px tall, and text in
// form fields at 16px (smaller text makes iPhones zoom the page when you tap a field).
//
// The look is industrial: square corners, solid 2px borders, flat colors, and a thick bottom
// edge on buttons that squashes down when pressed. Button labels use the display font (Bungee).

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const buttonBase = `inline-flex min-h-12 w-full items-center justify-center border-2 px-5 font-display text-sm tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const primaryButton = `${buttonBase} border-accent border-b-4 border-b-accent-lo bg-accent text-ink hover:bg-accent-hi active:translate-y-px active:border-b-2 disabled:active:translate-y-0 disabled:active:border-b-4`;

export const secondaryButton = `${buttonBase} border-line-strong border-b-4 text-fg hover:bg-surface active:translate-y-px active:border-b-2 active:bg-raised disabled:active:translate-y-0 disabled:active:border-b-4`;

export const dangerButton = `${buttonBase} border-danger-fill border-b-4 border-b-danger-fill-lo bg-danger-fill text-white hover:bg-danger-fill-hi active:translate-y-px active:border-b-2 disabled:active:translate-y-0 disabled:active:border-b-4`;


export const inputField = `block min-h-12 w-full border-2 bg-surface px-4 text-base text-fg placeholder:text-muted focus:outline-2 focus:outline-offset-0 focus:outline-brand`;

export const textLink = "font-medium text-brand underline underline-offset-4 hover:text-brand-hi";

// Forms and cards stay a comfortable width even on a big screen.
export const narrow = "mx-auto w-full max-w-sm";
