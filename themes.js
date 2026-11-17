/* V26: clubkleurkiezer. Onafhankelijk van wedstrijdopslag. */
(()=>{
 'use strict';
 const KEY='coaches-wissel-theme-v1';
 const themes=[["oranje-zwart", "Oranje / zwart", "#ee6b16", "#242424"], ["geel-blauw", "Geel / blauw", "#ffd600", "#1645a3"], ["rood-blauw", "Rood / blauw", "#d7263d", "#174ea6"], ["blauw-wit", "Blauw / wit", "#1455b5", "#ffffff"], ["rood-wit", "Rood / wit", "#cf202f", "#ffffff"], ["groen-wit", "Groen / wit", "#168047", "#ffffff"], ["paars-geel", "Paars / geel", "#682c91", "#ffdf32"], ["zwart-goud", "Zwart / goud", "#202020", "#e9b949"], ["rood-zwart", "Rood / zwart", "#c9272e", "#222222"], ["turquoise-navy", "Turquoise / navy", "#06a8aa", "#142d4e"]];
 const choices=document.getElementById('themeChoices');
 if(!choices)return;
 function luminance(hex){const a=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));return .2126*a[0]+.7152*a[1]+.0722*a[2];}
 function ink(hex){return luminance(hex)>.22?'#171717':'#ffffff';}
 function setTheme(id){
  const theme=themes.find(t=>t[0]===id)||themes[0];
  const root=document.documentElement;
  root.style.setProperty('--club-primary',theme[2]);
  root.style.setProperty('--club-secondary',theme[3]);
  root.style.setProperty('--club-on-primary',ink(theme[2]));
  root.style.setProperty('--club-on-secondary',ink(theme[3]));
  root.style.setProperty('--club-tint',`color-mix(in srgb, ${theme[2]} 12%, white)`);
  root.style.setProperty('--club-on-tint','#222222');
  root.style.setProperty('--club-bg',`color-mix(in srgb, ${theme[2]} 7%, white)`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme[2]);
  choices.querySelectorAll('[data-theme]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.theme===theme[0])));
  try{localStorage.setItem(KEY,theme[0]);}catch(e){}
 }
 choices.innerHTML=themes.map(([id,name,primary,secondary])=>`<button type="button" class="theme-choice" data-theme="${id}" aria-pressed="false"><span class="theme-swatches" aria-hidden="true"><span class="theme-swatch" style="background:${primary}"></span><span class="theme-swatch" style="background:${secondary}"></span></span><span class="theme-name">${name}</span></button>`).join('');
 choices.addEventListener('click',e=>{const b=e.target.closest('[data-theme]');if(b)setTheme(b.dataset.theme);});
 let saved;try{saved=localStorage.getItem(KEY);}catch(e){}
 setTheme(saved||'oranje-zwart');
})();
