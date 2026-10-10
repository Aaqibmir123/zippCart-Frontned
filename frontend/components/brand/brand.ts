export const APP_NAME = 'JhelumKart';
export const APP_TAGLINE = 'Shop local with ease';

// Shared vector source for the in-app mark and native splash asset.
export const brandLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 160" fill="none">
  <defs>
    <linearGradient id="cart" x1="10" y1="25" x2="130" y2="140" gradientUnits="userSpaceOnUse"><stop stop-color="#168F7A"/><stop offset="1" stop-color="#08762A"/></linearGradient>
    <linearGradient id="leaf" x1="65" y1="30" x2="160" y2="110" gradientUnits="userSpaceOnUse"><stop stop-color="#53BC76"/><stop offset="1" stop-color="#138B32"/></linearGradient>
    <linearGradient id="lime" x1="100" y1="100" x2="158" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="#51A81E"/><stop offset="1" stop-color="#9DDA36"/></linearGradient>
  </defs>
  <path d="M12 26h17c4 0 6 2 7 6l15 62c3 14 10 21 26 23l57 4" stroke="url(#cart)" stroke-width="13" stroke-linecap="round"/>
  <path d="M57 100 62 46c1-8 6-11 17-10 33-24 61-5 91-13-12 20-8 48-31 64-22 18-48 15-82 13Z" fill="url(#leaf)"/>
  <path d="M89 104c21-33 43-49 78-72 2 34-3 52-22 65-18 12-38 11-56 7Z" fill="url(#lime)"/>
  <path d="M67 106c20-37 44-59 97-77-32 17-59 41-75 64 17-1 31-6 44-13-10 10-28 19-45 22l-6 9Z" fill="white"/>
  <circle cx="70" cy="142" r="12" fill="url(#cart)"/><circle cx="124" cy="142" r="10" fill="url(#cart)"/>
</svg>`;
