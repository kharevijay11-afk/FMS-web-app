import { slides, gallery } from './content.js';
import { renderPage, filteredGallery, safeLink } from './pages.js';
import { bindInquiry, createSubmission } from './inquiry.js';
const main = document.querySelector('#main'), navigation = document.querySelector('#navigation'), toggle = document.querySelector('#menu-toggle');
const submission = createSubmission(({body,key})=>fetch('/api/v1/inquiries',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body}));
let slide = 0, lightboxTrigger = null;
const dialog = document.querySelector('#lightbox');
function closeMenu() { toggle.setAttribute('aria-expanded','false'); navigation.classList.remove('open'); }
toggle.addEventListener('click',()=>{ const open=toggle.getAttribute('aria-expanded')!=='true'; toggle.setAttribute('aria-expanded',String(open)); navigation.classList.toggle('open',open); });
document.addEventListener('keydown',event=>{if(event.key==='Escape' && navigation.classList.contains('open')) {closeMenu();toggle.focus();}});
function render(focus = true) {
 const route = location.hash.startsWith('#/') ? location.hash.slice(2) : '';
 main.innerHTML = renderPage(route); closeMenu();
 navigation.querySelectorAll('a').forEach(anchor=>{if(anchor.getAttribute('href')===`#/${route}`) anchor.setAttribute('aria-current','page');else anchor.removeAttribute('aria-current');});
 document.title = `${main.querySelector('h1')?.textContent || 'Public website'} | CREATE COMPUTER`;
 const form=main.querySelector('#inquiry-form'); if(form) bindInquiry(form,submission);
 main.querySelector('#verification-form')?.addEventListener('submit',event=>{event.preventDefault();main.querySelector('#verification-status').textContent='Verification is not available yet. Backend integration is pending; no certificate number was sent.';});
 slide=0;
 main.querySelector('#slide-prev')?.addEventListener('click',()=>changeSlide(-1));
 main.querySelector('#slide-next')?.addEventListener('click',()=>changeSlide(1));
 if(focus) {main.querySelector('h1')?.focus();window.scrollTo(0,0);}
}
function changeSlide(direction) {
 slide=(slide+direction+slides.length)%slides.length;const item=slides[slide];
 document.querySelector('#slide-heading').textContent=item.heading;document.querySelector('#slide-description').textContent=item.description;
 const link=document.querySelector('#slide-link');link.textContent=item.buttonText;link.href=safeLink(item.buttonLink)||'#/';
 const image=document.querySelector('#slide-image');image.src=item.image;image.alt=item.alt;
 document.querySelector('#slide-status').textContent=`${slide+1} / ${slides.length}`;
}
main.addEventListener('click',event=>{
 const filter=event.target.closest('[data-filter]');
 if(filter) { main.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button===filter)));main.querySelector('#gallery-results').innerHTML=filteredGallery(filter.dataset.filter);main.querySelector('#gallery-status').textContent=`${main.querySelectorAll('[data-gallery]').length} image${main.querySelectorAll('[data-gallery]').length === 1 ? '' : 's'}`; }
 const button=event.target.closest('[data-gallery]');
 if(button) { const item=gallery.find(item=>item.id===button.dataset.gallery);if(!item)return;lightboxTrigger=button;document.querySelector('#lightbox-title').textContent=item.category;const image=document.querySelector('#lightbox-image');image.src=item.image;image.alt=item.alt;dialog.showModal(); }
});
document.querySelector('#close-lightbox').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>lightboxTrigger?.focus());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
window.addEventListener('hashchange',()=>{if(location.hash!=='#main')render();});
document.querySelector('#year').textContent=new Date().getFullYear();
render(false);

