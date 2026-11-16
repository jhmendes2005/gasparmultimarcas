export const socialProfiles=Object.freeze([
 {name:'Instagram',url:'https://www.instagram.com/gaspar.multimarcas/',className:'social-instagram',icon:'<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor"/>'},
 {name:'Facebook',url:'https://www.facebook.com/share/1Bsq7CxYRx/?mibextid=wwXIfr',className:'social-facebook',icon:'<path d="M14 22v-9h3l.5-4H14V6.5c0-1.1.3-1.8 1.8-1.8H18V1.2C17.1 1.1 16.2 1 15.2 1 12.4 1 10 2.8 10 6.2V9H7v4h3v9z" fill="currentColor"/>'},
]);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function links(header=false){return socialProfiles.map(profile=>`<a class="${header?'':`social-link ${profile.className}`}" href="${escape(profile.url)}" target="_blank" rel="noopener noreferrer" aria-label="${profile.name} da Gaspar Multimarcas"><svg class="social-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${profile.icon}</svg>${header?'':`<span>${profile.name}</span><span aria-hidden="true">↗</span>`}</a>`).join('')}
export function renderSocialLinks(location){
 if(location==='header')return `<div class="header-socials" role="navigation" aria-label="Redes sociais da Gaspar">${links(true)}</div>`;
 if(location==='contact')return `<div class="contact-socials"><h3>Acompanhe nas redes</h3><div class="social-links">${links()}</div></div>`;
 return `<section class="footer-socials" aria-label="Acompanhe a Gaspar nas redes sociais"><div><h2>Acompanhe a Gaspar nas redes sociais.</h2><p>Veja as novidades e conheça a loja de perto.</p></div><nav class="social-links" aria-label="Instagram e Facebook da Gaspar">${links()}</nav></section>`;
}
