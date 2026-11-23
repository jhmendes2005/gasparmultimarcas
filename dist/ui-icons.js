const paths={
 'chevron-left':'<path d="m15 6-6 6 6 6"/>',
 'chevron-right':'<path d="m9 6 6 6-6 6"/>',
 expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
 'zoom-in':'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5M8 10.5h5M10.5 8v5"/>',
 'zoom-out':'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5M8 10.5h5"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
 'arrow-up-right':'<path d="M7 17 17 7M7 7h10v10"/>',
 'arrow-right':'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 'arrow-down':'<path d="M12 5v14m-6-6 6 6 6-6"/>',
 'arrow-left':'<path d="M19 12H5m6-6-6 6 6 6"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 'map-pin':'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
 gauge:'<path d="M4.9 18a9 9 0 1 1 14.2 0H4.9Z"/><path d="m12 12 4-4M5 12h1M8 6l.5.9M16 6l-.5.9M18 12h1"/><circle cx="12" cy="12" r="1"/>',
 transmission:'<path d="M6 4v16M18 4v8H6M12 4v8"/><circle cx="6" cy="4" r="1.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="18" cy="4" r="1.5"/><circle cx="6" cy="20" r="1.5"/>',
 shield:'<path d="M12 3 3.5 6v6c0 5 8.5 9 8.5 9s8.5-4 8.5-9V6L12 3Z"/><path d="m8 12 3 3 5-6"/>',
 exchange:'<path d="M3 7h18m-4-4 4 4-4 4M21 17H3m4-4-4 4 4 4"/>',
 'credit-card':'<rect x="2.5" y="4" width="19" height="16" rx="3"/><path d="M2.5 9h19M6 15h4"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 2l1 4M4 12l1 4a8 8 0 0 0 13 2"/>',
};
export function icon(name){
 if(!Object.hasOwn(paths,name))throw Error('Ícone desconhecido: '+name);
 return `<svg class="ui-icon ui-icon-${name}" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
