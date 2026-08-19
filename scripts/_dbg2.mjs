import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('node', ['server.js'], { cwd: '/home/user/robes-mvp', env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' }, stdio: ['ignore','pipe','pipe'] });
await new Promise((res)=>{const on=(b)=>{if(String(b).includes('listening')||String(b).includes(String(PORT)))res();};server.stdout.on('data',on);server.stderr.on('data',on);setTimeout(res,2500);});
const SUPA_STUB = `window.supabase = { createClient(){ const sess = { user: { id: 'u-test', email: 't@t.co' }, access_token: 'tok' };
  const q = () => ({ select(){ return this; }, eq(){ return this; }, order(){ return this; },
    single(){ return Promise.resolve({ data: window.__TEST_PROFILE, error: null }); },
    then(r){ return Promise.resolve({ data: [], error: null }).then(r); }, });
  return { auth: { onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; },
      getSession(){ return Promise.resolve({ data: { session: sess } }); }, signOut(){ return Promise.resolve({}); }, }, from(){ return q(); }, }; } };`;
const items = [
  {id:'w0',user_id:'u-test',label:'Acid green jumper',category:'Tops',color:'Green',brand:'',notes:'',image_url:null,times_worn:0,item_dna:{display:{primary_color_hex:'#B5BD16'}},hero_position:null,created_at:new Date().toISOString()},
  {id:'w1',user_id:'u-test',label:'Red canvas plimsoll',category:'Shoes',color:'Red',brand:'',notes:'',image_url:null,times_worn:0,item_dna:{display:{primary_color_hex:'#C0392B'}},hero_position:null,created_at:new Date().toISOString()},
  {id:'w2',user_id:'u-test',label:'Black waistcoat',category:'Outerwear',color:'Black',brand:'',notes:'',image_url:null,times_worn:0,item_dna:{display:{primary_color_hex:'#202021'}},hero_position:null,created_at:new Date().toISOString()},
];
const today = new Date(); const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const rows = [
  { user_id:'u-test', source_id:'999', source_type:'daily', day_index:0, slot:'day', day_date:iso(today), status:'planned', activity:'Everyday Office', headline:'A polished office look', thumb_urls:[], item_ids:['w0','w1','w2'], pinned:false, updated_at:new Date().toISOString() },
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
const page = await ctx.newPage();
await page.route('**cdn.jsdelivr.net/**', r=>r.fulfill({status:200,contentType:'application/javascript',body:SUPA_STUB}));
await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', r=>{const u=r.request().url();
  let body='[]';
  if (u.includes('wardrobe_items')) body=JSON.stringify(items);
  else if (u.includes('planned_days')) body = u.includes('day_date=gt.') ? '[]' : JSON.stringify(rows);
  return r.fulfill({status:200,contentType:'application/json',body});});
await page.route('**nominatim**', r=>r.abort());
await page.route('**open-meteo**', r=>r.abort());
await page.addInitScript(()=>{ window.__TEST_PROFILE = { first_name:'Annie', style_dna:{}, wardrobe_items_count:3, onboarded_at:'2026-07-01', gender_identity:'woman', style_icons:[] };
  Object.defineProperty(navigator,'geolocation',{value:undefined,configurable:true});
  localStorage.setItem('rb_looks__u-test', JSON.stringify([
    { id:'lk-1', name:'A look', pieces:[{id:'w0'},{id:'w1'}], wears:[], created_at:'2026-08-05T10:00:00Z' },
    { id:'lk-2', name:'B look', pieces:[{id:'w2'}], wears:[], created_at:'2026-08-04T10:00:00Z' },
  ]));});
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
await page.goto(`${BASE}/dashboard`,{waitUntil:'networkidle'});
await page.waitForTimeout(2800);
const st = await page.evaluate(()=>({
  swatches: Array.from(document.querySelectorAll('#rb-rail .dc-sw i')).map(i=>i.getAttribute('style')),
  cardHtml: (document.querySelector('#rb-rail .rb-dc.is-today')||{}).outerHTML?.slice(0,600),
}));
console.log(JSON.stringify(st,null,1)); console.log('ERRS', errs);
await browser.close(); server.kill();
