/* ══════════════════════════════════════════════════════════════════
   ROBES — app controller
   ══════════════════════════════════════════════════════════════════ */
const App = (function () {
  const $ = (id) => document.getElementById(id);
  const UN = (id, w = 640) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
  let userName = 'Annie';
  let genTime = 2200;

  /* ── DATA ──────────────────────────────────────────────────────── */
  const WIMG = (n) => `images/wimbledon/${n}.png`;

  const GALLERY = [
    { id:'wimbledon', title:'Wimbledon for Tennis', meta:'Just now', badge:'NEW', open:'board',
      layout:'split2', imgs:[WIMG('courtside-hero'), WIMG('london-street')] },
    { id:'summer', title:'Summer capsule —<br>twelve pieces, one case', meta:'Yesterday', open:'board', layout:'split-bigsmall',
      imgs:[UN('1490481651871-ab68de25d43d'), UN('1492707892479-7bc8d5a4ee93'), UN('1515886657613-9f3515b0c78f')] },
    { id:'piece', title:'Balmain waistcoat —<br>worn three ways', meta:'2 days ago', open:'piece', layout:'split-bigsmall',
      imgs:[UN('1485968579580-b6d095142e6e'), UN('1485462537746-965f33f7f6a7'), UN('1490481651871-ab68de25d43d')] },
    { id:'ibiza', title:'A week in Ibiza, late July', meta:'2 days ago', layout:'split2',
      imgs:[UN('1469334031218-e382a71b716b'), UN('1485462537746-965f33f7f6a7')] },
  ];

  const PILLS = ['Spring','Summer','Autumn','Winter'];
  const PILL_TEXT = {
    Spring:'Spring dressing — fresh layers, soft colour, transitional pieces for unpredictable weather',
    Summer:'Summer wardrobe — light linens, breathable fabrics, sun-ready and effortless',
    Autumn:'Autumn layering — rich tones, knits and tailoring for cooler days',
    Winter:'Winter dressing — warm textures, considered coats, polished cold-weather looks',
  };

  const MB_PIECES = [
    { name:'Pleated tennis skirt', brand:'Varley', retailer:'ASOS', price:'€98', img:WIMG('tennis-whites-flatlay'), pos:'30% 82%' },
    { name:'White cotton polo', brand:'COS', owned:true, wears:'Worn 4×', img:WIMG('tennis-whites-flatlay'), pos:'12% 12%' },
    { name:'Performance tank', brand:'Lululemon', retailer:'Lululemon.com', price:'€68', img:WIMG('oncourt-tank'), pos:'50% 30%' },
    { name:'Cream check blazer', brand:'Totême', owned:true, wears:'Worn 2×', img:WIMG('courtside-hero'), pos:'55% 14%' },
    { name:'Court sneakers · clay', brand:'Nike × RG', retailer:'Nike.com', price:'€110', img:WIMG('clay-linen'), pos:'50% 45%' },
    { name:'Structured tan tote', brand:'A.P.C.', retailer:'Net-a-Porter', price:'€295', img:WIMG('tan-tote'), pos:'50% 50%' },
    { name:'Wide-brim visor', brand:'Loro Piana', retailer:'LoroPiana.com', price:'€145', img:WIMG('oncourt-tank'), pos:'50% 6%' },
    { name:'Printed silk scarf', brand:'Hermès', retailer:'Hermès.com', price:'€195', img:WIMG('silk-scarf'), pos:'50% 22%' },
    { name:'Gold charm necklace', brand:'Sophie Bille Brahe', retailer:'Matches', price:'€185', img:WIMG('watch-necklace'), pos:'50% 8%' },
  ];

  /* Summer capsule — 12 essentials, 3 from her wardrobe */
  const SUMMER_PIECES = [
    { name:'White linen shirt', brand:'Totême', owned:true, wears:'Worn 5×', img:WIMG('tennis-whites-flatlay'), pos:'14% 16%' },
    { name:'Wide-leg linen trousers', brand:'COS', retailer:'COS.com', price:'€115', img:UN('1490481651871-ab68de25d43d'), pos:'50% 72%' },
    { name:'Off-white slip dress', brand:'The Row', retailer:'Net-a-Porter', price:'€420', img:UN('1485462537746-965f33f7f6a7'), pos:'50% 40%' },
    { name:'Breton boat tee', brand:'Saint James', retailer:'SaintJames.com', price:'€75', img:UN('1485968579580-b6d095142e6e'), pos:'50% 28%' },
    { name:'Tailored linen shorts', brand:'Arket', retailer:'Arket.com', price:'€69', img:UN('1539109136881-3be0616acf4b'), pos:'50% 62%' },
    { name:'Straw market tote', brand:'Loewe', retailer:'Net-a-Porter', price:'€390', img:UN('1502716119720-b23a93e5fe1b'), pos:'50% 50%' },
    { name:'Leather espadrilles', brand:'Castañer', retailer:'Castaner.com', price:'€98', img:UN('1515886657613-9f3515b0c78f'), pos:'50% 82%' },
    { name:'Flat tan sandals', brand:'Ancient Greek', retailer:'Matches', price:'€175', img:WIMG('clay-linen'), pos:'50% 70%' },
    { name:'Unlined linen blazer', brand:'Massimo Dutti', retailer:'MassimoDutti.com', price:'€129', img:WIMG('courtside-hero'), pos:'55% 16%' },
    { name:'Gold hoop earrings', brand:'Sophie Bille Brahe', owned:true, wears:'Worn 8×', img:WIMG('watch-necklace'), pos:'50% 8%' },
    { name:'Printed silk scarf', brand:'Hermès', owned:true, wears:'Worn 2×', img:WIMG('silk-scarf'), pos:'50% 22%' },
    { name:'Oversized sunglasses', brand:'Celine', retailer:'Celine.com', price:'€310', img:UN('1483985988355-763728e1935b'), pos:'50% 16%' },
  ];

  /* openable moodboards — populate the shared moodboard-panel */
  const BOARDS = {
    wimbledon: {
      crumb:'Wimbledon', shareName:'Wimbledon, London in July', shareImg:WIMG('courtside-hero'),
      title:'Wimbledon,<br>London in July',
      kws:['Minimalist','Chic','Refined','Tennis whites'],
      wx:{ icon:'⛅', strong:'London · July', items:['14°C – 23°C','Bring a light layer'] },
      aesthetic:'Classic & Sophisticated',
      mosaic:[WIMG('courtside-hero'),WIMG('london-street'),WIMG('oncourt-tank'),WIMG('tennis-whites-flatlay'),WIMG('tan-tote'),WIMG('clay-linen'),WIMG('court-sneakers'),WIMG('silk-scarf'),WIMG('watch-necklace')],
      railSub:'9 pieces · 2 from your wardrobe', yours:2, shop:7, pieces: MB_PIECES,
    },
    summer: {
      crumb:'Summer capsule', shareName:'Summer capsule — twelve essentials', shareImg:UN('1490481651871-ab68de25d43d'),
      title:'Summer capsule,<br>twelve essentials',
      kws:['Linen','Off-white','Effortless','Sun-ready'],
      wx:{ icon:'☀️', strong:'The season · Summer', items:['22°C – 31°C','One case, all season'] },
      aesthetic:'Relaxed & Refined',
      mosaic:[UN('1490481651871-ab68de25d43d',900),UN('1492707892479-7bc8d5a4ee93'),UN('1485462537746-965f33f7f6a7'),UN('1515886657613-9f3515b0c78f'),UN('1502716119720-b23a93e5fe1b'),UN('1485968579580-b6d095142e6e'),UN('1539109136881-3be0616acf4b'),UN('1483985988355-763728e1935b'),UN('1496747611176-843222e1e57c')],
      railSub:'12 pieces · 3 from your wardrobe', yours:3, shop:9, pieces: SUMMER_PIECES,
    },
  };
  let currentBoard = 'wimbledon';
  let tripOrigin = null;   // moodboard id a pack-flow started from (for breadcrumb back)
  const TRIP_CTX = {
    wimbledon: { dest:'Wimbledon, London', from:'2026-07-18', to:'2026-07-25' },
    summer:    { dest:'Amalfi Coast, Italy', from:'2026-08-08', to:'2026-08-16' },
  };

  /* STYLE A PIECE — inspiration for one item the user owns, worn three ways */
  const PIECE = {
    name:'your Balmain waistcoat',
    intro:'A sharp tailored piece does the most work in a wardrobe. Here it is three ways — none of them the obvious one.',
    ways: [
      { eyebrow:'Off-duty', title:'With straight-leg jeans', img:UN('1485968579580-b6d095142e6e',900), pos:'50% 24%',
        note:'Buttoned over bare skin with high-rise indigo and a loafer. The tailoring stops denim reading casual — sharp up top, easy below.',
        pieces:[
          { name:'High-rise straight jeans', brand:'Khaite', price:'€340', img:UN('1539109136881-3be0616acf4b'), pos:'50% 72%' },
          { name:'Leather loafers', brand:'Le Monde Béryl', price:'€395', img:WIMG('clay-linen'), pos:'50% 72%' },
          { name:'Gold hoop earrings', brand:'Sophie Bille Brahe', owned:true, img:WIMG('watch-necklace'), pos:'50% 8%' },
        ] },
      { eyebrow:'After dark', title:'Over a taffeta skirt', img:UN('1485462537746-965f33f7f6a7',900), pos:'50% 32%',
        note:'Wear it as the top — tucked into a full taffeta midi. Structure against volume, and nothing else is needed.',
        pieces:[
          { name:'Taffeta midi skirt', brand:'Cecilie Bahnsen', price:'€690', img:UN('1483985988355-763728e1935b'), pos:'50% 58%' },
          { name:'Strappy heeled sandals', brand:'The Row', price:'€890', img:WIMG('court-sneakers'), pos:'50% 72%' },
          { name:'Satin clutch', brand:'Bottega Veneta', price:'€1,900', img:WIMG('tan-tote'), pos:'50% 50%' },
        ] },
      { eyebrow:'Quiet luxury', title:'With palazzo pants', img:UN('1490481651871-ab68de25d43d',900), pos:'50% 30%',
        note:'A clean column with wide cream palazzo. Belt the waist to define the line and the whole look reads evening.',
        pieces:[
          { name:'Wide palazzo trousers', brand:'Totême', owned:true, img:UN('1490481651871-ab68de25d43d'), pos:'50% 74%' },
          { name:'Leather mules', brand:'Hereu', price:'€255', img:WIMG('clay-linen'), pos:'50% 66%' },
          { name:'Leather waist belt', brand:"Anderson's", price:'€120', img:WIMG('tan-tote'), pos:'50% 38%' },
        ] },
    ],
  };

  /* wardrobe items */
  const W = {
    blazer:{ name:'Cream check blazer', brand:'Totême', group:'Outerwear', wears:2, img:WIMG('courtside-hero'), pos:'55% 14%' },
    polo:  { name:'White cotton polo', brand:'COS', group:'Tops', wears:4, img:WIMG('tennis-whites-flatlay'), pos:'18% 30%' },
    tank:  { name:'Performance tank', brand:'Lululemon', group:'Tops', wears:6, img:WIMG('oncourt-tank'), pos:'50% 28%' },
    skirt: { name:'Pleated tennis skirt', brand:'Varley', group:'Bottoms', wears:3, img:WIMG('tennis-whites-flatlay'), pos:'50% 82%' },
    white: { name:'White court sneakers', brand:'Common Projects', group:'Shoes', wears:11, img:WIMG('court-sneakers'), pos:'50% 45%' },
    clay:  { name:'Clay court sneakers', brand:'Nike × RG', group:'Shoes', wears:1, img:WIMG('clay-linen'), pos:'50% 55%' },
    tote:  { name:'Structured tan tote', brand:'A.P.C.', group:'Accessories', wears:9, img:WIMG('tan-tote'), pos:'50% 50%' },
    scarf: { name:'Printed silk scarf', brand:'Hermès', group:'Accessories', wears:2, img:WIMG('silk-scarf'), pos:'50% 22%' },
    neck:  { name:'Gold charm necklace', brand:'Sophie Bille Brahe', group:'Accessories', wears:5, img:WIMG('watch-necklace'), pos:'50% 8%' },
    dress: { name:'Linen day dress', brand:'Totême', group:'Dresses', wears:0, img:WIMG('courtside-hero'), pos:'50% 60%' },
  };
  const WORDER = ['blazer','polo','tank','skirt','white','clay','tote','scarf','neck','dress'];

  /* outfit: slot → { label, current, alts } */
  let outfit = [
    { slot:'Outerwear', cur:'blazer', alts:['dress'] },
    { slot:'Top', cur:'polo', alts:['tank'] },
    { slot:'Bottom', cur:'skirt', alts:[] },
    { slot:'Shoes', cur:'white', alts:['clay'] },
    { slot:'Bag', cur:'tote', alts:[] },
    { slot:'Finishing touch', cur:'scarf', alts:['neck'] },
  ];

  const OCCASIONS = ['Garden party','Dinner out','Weekend errands',"The members' club",'Travel day'];
  let occasion = 'Garden party';
  const WHY = {
    'Garden party':"<strong>Rain holds off till evening</strong>, so the cream blazer earns its place — it lifts the polo without making it formal. The court sneakers keep it from going stiff. Every piece is already yours.",
    'Dinner out':"<strong>A layer for the 12°C walk in</strong>, then the blazer comes off at the table. The skirt reads polished; the tote does double duty. Nothing here is new — just styled properly.",
    'Weekend errands':"<strong>Built for moving</strong> — polo, skirt, your most-worn sneakers. The blazer is the one thing that makes it look considered rather than thrown on.",
    "The members' club":"<strong>Quiet, not loud</strong>. Cream on cream is the whole point. The silk scarf is the only flourish it needs — and it's the one you reach for least, so wear it.",
    'Travel day':"<strong>One bag, soft layers</strong>. The blazer survives the flight; the sneakers walk the terminal. Comfortable without looking like you gave up.",
  };

  /* the six things that define an outfit — per occasion */
  const FRAMEWORK = {
    'Garden party': {
      brief: { occasion:'Garden party', place:'Outdoor terrace, London', weather:'⛅ 21°, rain by evening', time:'Midday into afternoon' },
      dress: { tier:'Smart casual', pos:42, register:'Garden-party register — polished, never stiff. Dress for the lawn, not the boardroom.' },
      colour: { dominant:{hex:'#E8E1D4',name:'Cream'}, supporting:{hex:'#CFCBA8',name:'Soft sage'}, accent:{hex:'#A9885A',name:'Tan leather'}, note:'A cream base, sage to soften it, one tan moment. Nothing competes.' },
      proportion: { tags:['Relaxed top','Fitted skirt','Structured layer'], note:'A relaxed polo over the fitted pleated skirt — the blazer brings structure, ease lives everywhere else. The eye lands on the waist and rests at the hem.' },
      editorial: 'One elevating note — knotted at the throat or the bag handle. The single piece that lifts the whole thing. Resist a second.',
    },
    'Dinner out': {
      brief: { occasion:'Dinner out', place:'Restaurant, in town', weather:'🌙 12° on the walk in', time:'Evening' },
      dress: { tier:'Smart', pos:60, register:'Restaurant register — sharp on the walk in, easy once you sit. A notch up, not dressed up.' },
      colour: { dominant:{hex:'#2C2B2A',name:'Charcoal'}, supporting:{hex:'#E8E1D4',name:'Cream'}, accent:{hex:'#7C3B3B',name:'Oxblood'}, note:'Charcoal does the heavy lifting, cream lifts it, one oxblood note for warmth.' },
      proportion: { tags:['Sharp shoulder','Fitted skirt','Layer to lose'], note:'A fitted skirt with the blazer sharp on the shoulder — then it comes off at the table. A clean line walking in, ease the moment you sit.' },
      editorial: 'One deliberate shine at the neckline — the layer people remember. Just the one.',
    },
    'Weekend errands': {
      brief: { occasion:'On the move', place:'School run into errands', weather:'⛅ 18°, breezy', time:'Morning into afternoon' },
      dress: { tier:'Elevated casual', pos:22, register:'Built to move — but considered, not thrown on. Comfort that still reads put-together.' },
      colour: { dominant:{hex:'#D9CFC0',name:'Oat'}, supporting:{hex:'#F1ECE4',name:'Off-white'}, accent:{hex:'#7E7C5A',name:'Olive'}, note:'Oat and off-white keep it easy; one olive note stops it going bland.' },
      proportion: { tags:['Easy top','Skirt with movement','One structured note'], note:'Easy polo, a skirt with movement, your most-worn sneakers. The blazer is the single structured note that makes it read considered.' },
      editorial: 'Effort where it shows — one finishing piece tied to the bag, and nothing more.',
    },
    "The members' club": {
      brief: { occasion:"The members' club", place:"Private members' club", weather:'⛅ 19°, mild indoors', time:'Afternoon into evening' },
      dress: { tier:'Quiet smart', pos:52, register:'Quiet, not loud. Read the room — restraint is the whole point here.' },
      colour: { dominant:{hex:'#E8E1D4',name:'Cream'}, supporting:{hex:'#DCD4C6',name:'Bone'}, accent:{hex:'#B79B6B',name:'Pale gold'}, note:'Cream on cream is the point. Gold is the only flourish it needs.' },
      proportion: { tags:['Clean column','Fitted body','Fluid hem'], note:'A clean cream column — fitted through the body, fluid at the hem. Quiet volume, nowhere loud.' },
      editorial: 'In a room this restrained, one printed note is the whole statement.',
    },
    'Travel day': {
      brief: { occasion:'Travel day', place:'Airport into arrival', weather:'✈️ Variable — layer for it', time:'All day' },
      dress: { tier:'Considered casual', pos:16, register:'Comfortable without looking like you gave up. Soft, but deliberate.' },
      colour: { dominant:{hex:'#B7976E',name:'Camel'}, supporting:{hex:'#E8E1D4',name:'Cream'}, accent:{hex:'#2C2B2A',name:'Ink'}, note:'A camel base, cream to breathe, ink to anchor. Three tones, no more.' },
      proportion: { tags:['Soft layers','Relaxed line','One structured layer'], note:'Soft layers that survive the seat, sneakers that walk the terminal — relaxed top to bottom with one structured layer pulling it together.' },
      editorial: 'The one considered touch that travels with you — on before security, on all day.',
    },
  };

  /* recent looks (Get dressed · Style today) */
  const LOOKS = [
    { id:'garden',  title:'Garden party — cream on cream', meta:'Just now',   badge:'NEW', worn:'Styled today', occasion:'Garden party',       img:WIMG('london-street'),      pos:'50% 58%' },
    { id:'office',  title:'Office Tuesday — tartan, sharp', meta:'Yesterday',  worn:'Worn',           occasion:"The members' club", img:UN('1485968579580-b6d095142e6e'), pos:'50% 26%' },
    { id:'brunch',  title:'Sunday brunch — burgundy, red lip', meta:'2 days ago', worn:'Worn',        occasion:'Dinner out',         img:UN('1483985988355-763728e1935b'), pos:'50% 22%' },
    { id:'date',    title:'Date night — the red silk midi', meta:'Last week',  worn:'Worn',           occasion:'Dinner out',         img:UN('1490481651871-ab68de25d43d'), pos:'50% 38%' },
    { id:'errands', title:'Weekend errands — easy knit',  meta:'Last week',    worn:'Worn 2×',        occasion:'Weekend errands',    img:UN('1485231183945-fffde7cc051e'), pos:'50% 28%' },
    { id:'whites',  title:"Members' club — quiet whites",  meta:'2 weeks ago', worn:'Worn',           occasion:"The members' club", img:WIMG('courtside-hero'),     pos:'55% 16%' },
  ];

  /* this week (Get dressed · Plan the week) — today is Friday */
  const WEEK = [
    { day:'Mon', occasion:'Office',        look:'office',  img:UN('1485968579580-b6d095142e6e'), pos:'50% 26%' },
    { day:'Tue', occasion:'Client dinner', look:'whites',  img:UN('1485462537746-965f33f7f6a7'), pos:'50% 30%' },
    { day:'Wed', occasion:'Casual',        look:'errands', img:UN('1539109136881-3be0616acf4b'), pos:'50% 24%' },
    { day:'Thu', occasion:'Brunch',        look:'brunch',  img:UN('1483985988355-763728e1935b'), pos:'50% 22%' },
    { day:'Fri', occasion:'Date night',    look:'date',    img:UN('1490481651871-ab68de25d43d'), pos:'50% 36%', today:true },
    { day:'Sat', occasion:'',              look:null },
    { day:'Sun', occasion:'Easy day',      look:'garden',  img:WIMG('london-street'),      pos:'50% 58%' },
  ];

  /* composer copy per mode / sub-tab */
  const COMPOSER = {
    inspire:    { ph:'Describe the vibe, occasion, or aesthetic',        hint:'Build a Moodboard from scratch' },
    today:      { ph:'What are you dressing for today?',                  hint:'Style what you own today' },
    week:       { ph:'Tell me about your week — events, vibe, mood',      hint:'Plan 7 days from your wardrobe' },
    trip:       { ph:'Where to? Add your dates and the occasion',         hint:'Pack a trip from your wardrobe' },
  };

  /* pack a trip (Get dressed · Pack a trip) */
  const TRIP = {
    dest:'Wimbledon', city:'London', dates:'18–25 July · 7 days',
    take:['blazer','polo','skirt','dress','white','tote','scarf'],
    gaps:[
      { name:'Court sneakers · clay', brand:'Nike × RG', retailer:'Nike.com', price:'€110', img:WIMG('clay-linen'), pos:'50% 45%' },
      { name:'Wide-brim visor', brand:'Loro Piana', retailer:'LoroPiana.com', price:'€145', img:WIMG('oncourt-tank'), pos:'50% 6%' },
      { name:'Gold charm necklace', brand:'Sophie Bille Brahe', retailer:'Matches', price:'€185', img:WIMG('watch-necklace'), pos:'50% 8%' },
    ],
  };

  /* saved trips shown on the Pack-a-trip landing */
  const TRIPS = [
    { id:'wimbledon', dest:'Wimbledon', city:'London', dates:'18–25 July · 7 days',
      img:WIMG('courtside-hero'), pos:'52% 14%',
      weather:'⛅ 14°–23°C', note:'Smart-casual · garden',
      take: TRIP.take, gaps: TRIP.gaps },
  ];
  const DRESS_PILLS = ['Work day','Weekend lunch','Dinner date','School run','Saturday night'];
  const DRESS_PILL_TEXT = {
    'Work day':"Big client meeting in the office in London today. Want to feel sharp and in control but not like I'm trying too hard. Power without the suit.",
    'Weekend lunch':'Sunday lunch with friends, outdoor terrace, summer vibe. Relaxed but want to look like I made an effort. Nothing too done.',
    'Dinner date':'Dinner date tonight, nice restaurant. Want to feel confident and a bit magnetic. Feminine but not obvious about it.',
    'School run':'School drop-off then straight to meetings and errands all day. Need to move in it. Want to feel put together, and turn a few heads.',
    'Saturday night':'Drinks then dinner with the girls, Saturday night, buzzy bar in the city. Want to feel a bit dressed up, a bit fun. Not a special occasion dress — more like my best self on a normal night.',
  };
  const PILL_OCC = { 'Work day':"The members' club", 'Weekend lunch':'Garden party', 'Dinner date':'Dinner out', 'School run':'Weekend errands', 'Saturday night':'Dinner out' };
  const PIECE_PILLS = ['Balmain waistcoat','Leather trench coat','A silk slip dress'];
  const INTENT_COPY = {
    trip:    { ph:'Where, when, what kind of trip…',                        hint:'Trip moodboard, styled from your wardrobe' },
    capsule: { ph:'Season, lifestyle, how many pieces, any constraints…',     hint:'Build a capsule wardrobe' },
    piece:   { ph:'Share an image and some inspiration',                      hint:'Style a key piece, worn three ways' },
  };

  let mode = 'inspire';      // 'inspire' | 'dressed'
  let subtab = 'today';      // 'today' | 'week'
  let intent = 'trip';       // inspire intent: 'trip' | 'capsule' | 'piece'
  let gdCtx = null;          // optional {eyebrow,title,img} for the result hero

  /* ── VIEW SWITCHING ────────────────────────────────────────────── */
  const VIEWS = ['gallery','looks','week','trip-list','trip','gen-panel','moodboard-panel','piece-panel','gd-result','wardrobe-panel'];
  const HOME_VIEWS = ['gallery','looks','week','trip-list'];
  function showView(name, bcLabel) {
    VIEWS.forEach(v => { const el = $(v); if (el) el.classList.toggle('visible', v === name); });
    const home = HOME_VIEWS.includes(name);
    $('home-body').classList.toggle('left-hidden', !home);
    $('nav-wordmark').classList.toggle('hidden', !home);
    $('nav-breadcrumb').classList.toggle('visible', !home);
    if (bcLabel) $('bc-label').textContent = bcLabel;
    $('right').scrollTop = 0; window.scrollTo(0, 0);
  }

  function applyComposer() {
    const c = mode === 'inspire' ? INTENT_COPY[intent] : COMPOSER[subtab];
    $('home-ta').placeholder = c.ph;
    $('hp-hint').textContent = c.hint;
    // pills swap with mode / intent / sub-tab
    const pills = mode === 'inspire'
      ? (intent === 'piece' ? PIECE_PILLS : PILLS)
      : (subtab === 'trip' ? PILLS : DRESS_PILLS);
    $('quick-pills').innerHTML = pills.map(p => `<button class="qpill" onclick="App.usePill('${p.replace(/'/g, "\\'")}')">${p}</button>`).join('');
    // intent selector (inspire) vs sub-tabs (dressed)
    $('subtabs').hidden = mode !== 'dressed';
    $('inspire-modes').hidden = mode !== 'inspire';
    $('st-today').classList.toggle('active', subtab === 'today');
    $('st-week').classList.toggle('active', subtab === 'week');
    $('st-trip').classList.toggle('active', subtab === 'trip');
    $('im-trip').classList.toggle('active', intent === 'trip');
    $('im-capsule').classList.toggle('active', intent === 'capsule');
    $('im-piece').classList.toggle('active', intent === 'piece');
    // the add-image control leads in Key-piece mode (“share an image”)
    const keyMode = mode === 'inspire' && intent === 'piece';
    $('hp-add-btn').classList.toggle('is-key', keyMode);
  }
  function setIntent(i) {
    intent = i;
    mode = 'inspire';
    applyComposer();
    showView('gallery');
    setTimeout(() => $('home-ta').focus(), 80);
  }

  function goHome() {
    tripOrigin = null;
    mode = 'inspire';
    intent = 'trip';
    $('mc-inspire').className = 'mc active-inspire';
    $('mc-dressed').className = 'mc';
    applyComposer();
    showView('gallery');
    closeAvatarMenu();
  }
  function chooseInspire() {
    if (mode !== 'inspire') goHome();
    else showView('gallery');
    setTimeout(() => $('home-ta').focus(), 200);
  }
  function chooseDressed() {
    tripOrigin = null;
    mode = 'dressed';
    $('mc-dressed').className = 'mc active-dressed';
    $('mc-inspire').className = 'mc';
    applyComposer();
    renderDressedRight();
  }
  function setSubtab(t) {
    tripOrigin = null;
    subtab = t;
    mode = 'dressed';
    applyComposer();
    renderDressedRight();
  }
  function renderDressedRight() {
    if (subtab === 'week') { renderWeek(); showView('week', 'This week'); }
    else if (subtab === 'trip') { tripOrigin = null; renderTripList(); showView('trip-list', 'Pack a trip'); }
    else { renderLooks(); showView('looks', 'Recent looks'); }
  }
  function back() {
    // Returning from a pack flow that began on a moodboard → go back to that board.
    if (tripOrigin && BOARDS[tripOrigin] && $('trip').classList.contains('visible')) {
      const o = tripOrigin; tripOrigin = null;
      mode = 'inspire';
      $('mc-inspire').className = 'mc active-inspire';
      $('mc-dressed').className = 'mc';
      applyComposer();
      renderMoodboard(o);
      return;
    }
    if ($('trip').classList.contains('visible')) {
      tripOrigin = null;
      renderTripList(); showView('trip-list', 'Pack a trip');
      return;
    }
    if (mode === 'dressed') renderDressedRight();
    else { showView('gallery'); }
  }

  /* ── GENERATION ────────────────────────────────────────────────── */
  function generate({ label, sublabel, then }) {
    showView('gen-panel', 'Generating');
    $('gen-label').innerHTML = label;
    $('gen-sublabel').textContent = sublabel;
    const steps = [...document.querySelectorAll('.gen-step')];
    steps.forEach(s => s.classList.remove('on'));
    let i = 0;
    const stepGap = Math.max(160, (genTime - 200) / steps.length);
    const tick = () => { if (i < steps.length) { steps[i].classList.add('on'); i++; setTimeout(tick, stepGap); } };
    tick();
    setTimeout(then, genTime);
  }

  function generateMoodboard(boardId) {
    boardId = boardId || 'wimbledon';
    const b = BOARDS[boardId];
    generate({
      label: `Building your ${b.crumb} Moodboard…`,
      sublabel: boardId === 'summer' ? 'Pulling references, building your capsule' : 'Pulling references, checking the London forecast',
      then: () => { renderMoodboard(boardId); if (boardId === 'wimbledon') markBoardNew(); },
    });
  }
  function stylePiece(name) {
    const n = (name && name.trim()) ? name.trim().replace(/^(a|an|the)\s+/i, '') : '';
    PIECE.display = n ? n.charAt(0).toUpperCase() + n.slice(1) : 'Balmain waistcoat';
    PIECE.name = n ? `your ${n}` : 'your Balmain waistcoat';
    generate({
      label: `Styling ${PIECE.name}…`,
      sublabel: 'Three ways to wear it — from your wardrobe out',
      then: () => { renderPiece(); showView('piece-panel', 'Style a piece'); },
    });
  }
  function submitHomePrompt() {
    const v = $('home-ta').value.trim();
    if (!v) { $('home-ta').focus(); return; }
    if (mode === 'inspire') {
      if (intent === 'piece') { stylePiece(v); return; }
      if (intent === 'capsule') { generateMoodboard('summer'); return; }
      const summer = /summer|capsule|linen|riviera|coastal|espadrille/i.test(v);
      generateMoodboard(summer ? 'summer' : 'wimbledon'); return;
    }
    if (subtab === 'week') { planWeek(v); return; }
    runGetDressed({ prompt: v });
  }

  function runGetDressed(opts = {}) {
    const t = opts.prompt || '';
    occasion = opts.occasion || occasion;
    gdCtx = opts.ctx || null;
    generate({
      label: 'Styling from your wardrobe…',
      sublabel: t ? `“${t.slice(0, 48)}${t.length > 48 ? '…' : ''}”` : `${occasion} · weighing the forecast`,
      then: () => { renderOutfit(); showView('gd-result', gdCtx ? gdCtx.crumb || 'Your look' : 'Your look'); },
    });
  }

  function planWeek(prompt) {
    generate({
      label: 'Planning your week…',
      sublabel: prompt ? `“${prompt.slice(0, 48)}${prompt.length > 48 ? '…' : ''}”` : 'Seven days, weighed against the forecast',
      then: () => { subtab = 'week'; mode = 'dressed'; applyComposer(); renderWeek(); showView('week', 'This week'); toast('Your week is planned — 6 looks ready'); },
    });
  }

  /* ── RENDERERS ─────────────────────────────────────────────────── */
  function renderGallery() {
    $('mix-grid').innerHTML = GALLERY.map((c, idx) => {
      const imgs = c.layout === 'split-bigsmall'
        ? `<img class="mi-big" src="${c.imgs[0]}" alt=""><img src="${c.imgs[1]}" alt=""><img src="${c.imgs[2]}" alt="">`
        : c.imgs.map(s => `<img src="${s}" alt="">`).join('');
      return `<article class="mix-card${c.badge ? ' is-new' : ''}" style="animation-delay:${idx * 0.05}s" onclick="App.openCard('${c.id}')">
        <div class="mix-imgs ${c.layout}">
          <button class="mix-share" onclick="event.stopPropagation();App.openShare()"><svg viewBox="0 0 24 24"><polygon points="3 3 21 12 3 21 3 3"/><line x1="3" y1="12" x2="21" y2="12"/></svg></button>
          ${imgs}
        </div>
        <div class="mix-foot">
          <div><div class="mix-title">${c.title}</div><div class="mix-meta">${c.meta}</div></div>
          ${c.badge ? `<span class="mix-badge">${c.badge}</span>` : ''}
        </div>
      </article>`;
    }).join('');
  }
  function openCard(id) {
    const c = GALLERY.find(x => x.id === id);
    if (c && c.open === 'board') renderMoodboard(id);
    else if (c && c.open === 'piece') stylePiece();
    else toast('That board is part of the full demo');
  }
  function markBoardNew() {
    const w = GALLERY.find(x => x.id === 'wimbledon');
    if (w) { w.meta = 'Just now'; w.badge = 'NEW'; }
  }

  /* recent looks — reuses the gallery card language (portrait) */
  function renderLooks() {
    $('looks-grid').innerHTML = LOOKS.map((l, idx) => `
      <article class="mix-card${l.badge ? ' is-new' : ''}" style="animation-delay:${idx * 0.04}s" onclick="App.openLook('${l.id}')">
        <div class="mix-imgs portrait${l.badge ? '' : ''}">
          <button class="mix-share" onclick="event.stopPropagation();App.openShare()"><svg viewBox="0 0 24 24"><polygon points="3 3 21 12 3 21 3 3"/><line x1="3" y1="12" x2="21" y2="12"/></svg></button>
          <span class="mix-worn"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>${l.worn}</span>
          <img src="${l.img}" style="object-position:${l.pos}" alt="">
        </div>
        <div class="mix-foot">
          <div><div class="mix-title">${l.title}</div><div class="mix-meta">${l.meta}</div></div>
          ${l.badge ? `<span class="mix-badge">${l.badge}</span>` : ''}
        </div>
      </article>`).join('');
  }
  function openLook(id) {
    const l = LOOKS.find(x => x.id === id);
    if (!l) return;
    occasion = l.occasion;
    runGetDressed({ occasion: l.occasion, ctx: {
      eyebrow: l.worn === 'Styled today' ? `Today · ${l.title.split(' — ')[0]}` : l.title.split(' — ')[0],
      title: l.title.split(' — ')[1] ? l.title.split(' — ')[1].replace(/^./, c => c.toUpperCase()) + '.' : l.title,
      img: l.img, crumb: 'Recent looks',
    }});
  }

  /* this week calendar */
  function renderWeek() {
    $('week-strip').innerHTML = WEEK.map(d => {
      if (!d.look) {
        return `<div class="day">
          <div class="day-label">${d.day}</div>
          <button class="day-card day-empty" onclick="App.fillDay('${d.day}')"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <div class="day-occ day-empty-occ">Open</div>
        </div>`;
      }
      return `<div class="day${d.today ? ' today' : ''}">
        <div class="day-label">${d.day}</div>
        <button class="day-card" onclick="App.openDay('${d.day}')">
          ${d.today ? '<span class="day-today-tag">Today</span>' : ''}
          <img src="${d.img}" style="object-position:${d.pos}" alt="">
        </button>
        <div class="day-occ">${d.occasion}</div>
      </div>`;
    }).join('');
  }
  function openDay(day) {
    const d = WEEK.find(x => x.day === day);
    if (!d || !d.look) return;
    const l = LOOKS.find(x => x.id === d.look);
    occasion = l ? l.occasion : occasion;
    runGetDressed({ occasion, ctx: {
      eyebrow: `${day} · ${d.occasion}`,
      title: l && l.title.split(' — ')[1] ? l.title.split(' — ')[1].replace(/^./, c => c.toUpperCase()) + '.' : d.occasion + '.',
      img: d.img, crumb: 'This week',
    }});
  }
  function fillDay(day) {
    const d = WEEK.find(x => x.day === day);
    if (!d) return;
    runGetDressed({ occasion: 'Weekend errands', ctx: {
      eyebrow: `${day} · open`,
      title: "Let's fill<br>Saturday.",
      img: 'images/wimbledon/london-street.png', crumb: 'This week',
    }});
  }

  /* pack a trip — landing list of saved trips */
  function renderTripList() {
    const cards = TRIPS.map(t => `
      <article class="trip-tile" onclick="App.openTrip('${t.id}')">
        <div class="trip-tile-img"><img src="${t.img}" style="object-position:${t.pos}" alt=""></div>
        <div class="trip-tile-body">
          <div class="trip-tile-dest">${t.dest} <em>· ${t.city}</em></div>
          <div class="trip-tile-dates">${t.dates}</div>
          <div class="trip-tile-meta"><span>${t.take.length + t.gaps.length} pieces</span><span class="ttm-dot"></span><span class="s">${t.take.length} yours</span><span class="ttm-dot"></span><span class="r">${t.gaps.length} to find</span></div>
          <div class="trip-tile-wx">${t.weather} · ${t.note}</div>
        </div>
        <div class="trip-tile-go"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </article>`).join('');
    const add = `<button class="trip-tile trip-tile-add" onclick="App.openPack()">
        <div class="trip-tile-addicon"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
        <div class="trip-tile-body"><div class="trip-tile-dest add">Plan a new trip</div><div class="trip-tile-dates">Add a destination and dates</div></div>
      </button>`;
    $('trips-grid').innerHTML = cards + add;
  }
  function openTrip(id) {
    const t = TRIPS.find(x => x.id === id);
    if (!t) return;
    tripOrigin = null;
    TRIP.dest = t.dest; TRIP.city = t.city; TRIP.dates = t.dates;
    TRIP.take = t.take; TRIP.gaps = t.gaps;
    showTripDetail('Pack a trip');
  }
  function showTripDetail(crumb) {
    renderTrip();
    showView('trip', crumb);   // 'trip' is a sub-page now → showView sets breadcrumb chrome
  }

  /* pack a trip */
  function renderTrip() {
    $('trip-count').textContent = TRIP.take.length + TRIP.gaps.length;
    $('trip-yours').textContent = TRIP.take.length;
    $('trip-find').textContent = TRIP.gaps.length;
    $('trip-dest').innerHTML = `${TRIP.dest} · <em>${TRIP.city}</em>`;
    $('trip-dates').textContent = TRIP.dates;
    $('trip-take').innerHTML = TRIP.take.map(id => {
      const it = W[id];
      return `<div class="tt-item">
        <div class="tt-imgwrap">
          <img src="${it.img}" style="object-position:${it.pos}" alt="">
          <span class="tt-yours"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Yours</span>
        </div>
        <div class="tt-name">${it.name}</div>
        <div class="tt-meta">${it.brand}</div>
      </div>`;
    }).join('');
    $('trip-gaps').innerHTML = TRIP.gaps.map(g => `
      <div class="gap-card">
        <img class="gap-img" src="${g.img}" style="object-position:${g.pos}" alt="">
        <div class="gap-info"><div class="gap-name">${g.name}</div><div class="gap-brand">${g.brand} · ${g.price}</div></div>
        <button class="gap-shop" onclick="App.toast('Opening ${g.brand} at ${g.retailer}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="9" height="9"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>Shop</button>
      </div>`).join('');
  }
  function packTrip(prompt) {
    generate({
      label: 'Packing your trip…',
      sublabel: prompt ? `“${prompt.slice(0, 48)}${prompt.length > 48 ? '…' : ''}”` : `${TRIP.dest} · matching your wardrobe to the forecast`,
      then: () => { subtab = 'trip'; mode = 'dressed'; applyComposer(); renderTrip(); showView('trip', 'Pack a trip'); toast(`Packing list ready — ${TRIP.take.length + TRIP.gaps.length} pieces`); },
    });
  }
  function packFromBoard() {
    // Open the trip modal first, pre-filled for the board we came from.
    tripOrigin = currentBoard;
    const c = TRIP_CTX[currentBoard] || TRIP_CTX.wimbledon;
    $('pack-dest').value = c.dest;
    $('pack-date-from').value = c.from;
    $('pack-date-to').value = c.to;
    openPack();
  }
  function formatRange(from, to) {
    const a = new Date(from + 'T00:00'), b = new Date(to + 'T00:00');
    if (isNaN(a) || isNaN(b)) return TRIP.dates;
    const mon = d => d.toLocaleDateString('en-GB', { month: 'short' });
    const days = Math.max(1, Math.round((b - a) / 86400000) + 1);
    const span = a.getMonth() === b.getMonth()
      ? `${a.getDate()}–${b.getDate()} ${mon(b)}`
      : `${a.getDate()} ${mon(a)} – ${b.getDate()} ${mon(b)}`;
    return `${span} · ${days} day${days !== 1 ? 's' : ''}`;
  }
  function buildPackingList() {
    const dest = ($('pack-dest').value || '').trim();
    if (dest) { const parts = dest.split(',').map(s => s.trim()); TRIP.dest = parts[0] || TRIP.dest; TRIP.city = parts[1] || TRIP.city; }
    const from = $('pack-date-from').value, to = $('pack-date-to').value;
    if (from && to) TRIP.dates = formatRange(from, to);
    closeSheet('pack-sheet');
    const origin = tripOrigin;
    generate({
      label: 'Packing your trip…',
      sublabel: `${TRIP.dest} · matching your wardrobe to the forecast`,
      then: () => {
        mode = 'dressed'; subtab = 'trip'; applyComposer();
        tripOrigin = (origin && BOARDS[origin]) ? origin : null;
        showTripDetail(tripOrigin ? BOARDS[tripOrigin].crumb : 'Pack a trip');
        toast(`Packing list ready — ${TRIP.take.length + TRIP.gaps.length} pieces`);
      },
    });
  }

  function pieceThumb(p) {
    return p.img
      ? `<img class="piece-img" src="${p.img}" style="object-position:${p.pos || '50% 50%'}" alt="">`
      : `<div class="piece-ph"><svg viewBox="0 0 24 24"><path d="M20.4 14.5L16 10 4 20"/><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/></svg></div>`;
  }
  function renderMoodboard(id) {
    const b = BOARDS[id];
    if (!b) { toast('That board is part of the full demo'); return; }
    currentBoard = id;
    $('mb-out-title').innerHTML = b.title;
    $('mb-out-kws').innerHTML = b.kws.map((k, i) =>
      `<span class="mb-kw">${k}</span>${i < b.kws.length - 1 ? '<span class="mb-kw-dot">·</span>' : ''}`).join('');
    $('mb-wx').innerHTML = `<span class="w-icon">${b.wx.icon}</span><span class="w-info"><strong>${b.wx.strong}</strong></span>`
      + b.wx.items.map(t => `<div class="w-divider"></div><span class="w-info">${t}</span>`).join('');
    $('mb-aesthetic').textContent = b.aesthetic;
    $('mb-mosaic').innerHTML = b.mosaic.map((s, i) => `<img class="${i === 0 ? 'mme-hero' : ''}" src="${s}" alt="">`).join('');
    $('mb-rail-sub').textContent = b.railSub;
    $('mb-rail-stat').innerHTML = `<span class="s">${b.yours}</span> yours · <span class="r">${b.shop}</span> to shop`;
    $('share-thumb').src = b.shareImg;
    $('share-name').textContent = b.shareName;
    $('rename-input').value = b.shareName;
    renderPieces($('mb-rail-pieces'), b.pieces);
    showView('moodboard-panel', b.crumb);
  }
  function renderPieces(host, pieces) {
    host.innerHTML = pieces.map((p, i) => {
      const meta = p.owned
        ? `<div class="owned-status"><span class="owned-badge"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> In your wardrobe</span><span class="owned-wears">${p.wears}</span></div>`
        : `<div class="piece-meta"><span class="piece-retailer">${p.retailer}</span><span class="piece-price">${p.price}</span></div>`;
      const actions = p.owned
        ? `<button class="in-wardrobe-btn"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Yours</button><button class="swap-link" onclick="App.toast('Swapped from your wardrobe')">Swap out</button>`
        : `<button class="shop-btn" onclick="App.toast('Opening ${p.brand} at ${p.retailer}')"><svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Shop</button><button class="swap-link" onclick="App.toast('Finding an alternative')">Swap</button>`;
      const tick = p.owned ? `<div class="owned-tick"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>` : '';
      return `<div class="piece${p.owned ? ' owned' : ''}">
        <div class="piece-img-wrap">${pieceThumb(p)}${tick}</div>
        <div class="piece-info"><div class="piece-name">${p.name}</div><div class="piece-brand">${p.brand}</div>${meta}</div>
        <div class="piece-actions">${actions}</div>
      </div>${i < pieces.length - 1 ? '<div class="piece-divider"></div>' : ''}`;
    }).join('');
  }
  function renderPiece() {
    if ($('pyp-name')) $('pyp-name').textContent = PIECE.display || 'Balmain waistcoat';
    $('piece-intro').textContent = PIECE.intro;
    $('ways').innerHTML = PIECE.ways.map((w, i) => `
      <article class="way">
        <div class="way-img">
          <img src="${w.img}" style="object-position:${w.pos || '50% 30%'}" alt="">
          <span class="way-num">${String(i + 1).padStart(2, '0')}</span>
        </div>
        <div class="way-body">
          <div class="way-eyebrow">${w.eyebrow}</div>
          <div class="way-title">${w.title}</div>
          <div class="way-note">${w.note}</div>
          <div class="way-pieces">
            ${w.pieces.map(p => `
              <div class="wp${p.owned ? ' owned' : ''}">
                <img class="wp-img" src="${p.img}" style="object-position:${p.pos || '50% 50%'}" alt="">
                <div class="wp-info">
                  <div class="wp-name">${p.name}</div>
                  <div class="wp-meta">${p.owned ? 'In your wardrobe' : `${p.brand} · ${p.price}`}</div>
                </div>
                ${p.owned
                  ? '<span class="wp-badge"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Yours</span>'
                  : `<button class="wp-shop" onclick="App.toast('Opening ${p.brand}')">Shop</button>`}
              </div>`).join('')}
          </div>
        </div>
      </article>`).join('');
  }

  function renderOutfit() {
    const titles = {
      'Garden party':'Cream on cream,<br>quietly done.',
      'Dinner out':'Polished, with<br>a layer to lose.',
      'Weekend errands':'Easy, but<br>put-together.',
      "The members' club":'Quiet luxury,<br>nothing loud.',
      'Travel day':'Soft layers,<br>one bag.',
    };
    $('gd-hero-eyebrow').textContent = gdCtx ? gdCtx.eyebrow : `Today · ${occasion}`;
    $('gd-hero-title').innerHTML = gdCtx ? gdCtx.title : (titles[occasion] || titles['Garden party']);
    $('gd-piececount').textContent = `${outfit.length} pieces`;

    const fw = FRAMEWORK[occasion] || FRAMEWORK['Garden party'];

    // the three-colour palette — visual only, no prose
    $('look-palette').innerHTML = [fw.colour.dominant, fw.colour.supporting, fw.colour.accent]
      .map(c => `<span class="lp-dot" style="background:${c.hex}" title="${c.name}"></span>`).join('');

    // the outfit board — a clean grid of pieces, each swappable in place
    const swapIco = '<svg class="lp-swap-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
    $('look-board').innerHTML = outfit.map((s, i) => {
      const it = W[s.cur];
      const swaps = s.alts.length
        ? `<div class="lp-swaps">${swapIco}${s.alts.map(id => {
            const a = W[id];
            return `<button class="lp-swap" title="Swap in ${a.name}" onclick="App.pickAlt(${i},'${id}')"><img src="${a.img}" style="object-position:${a.pos}" alt=""></button>`;
          }).join('')}</div>`
        : '<div class="lp-swaps"></div>';
      return `<div class="lp-card">
        <div class="lp-imgwrap"><img class="lp-img" src="${it.img}" style="object-position:${it.pos}" alt=""><span class="lp-slot">${s.slot}</span></div>
        <div class="lp-foot"><div class="lp-name">${it.name}</div><div class="lp-brand">${it.brand}</div></div>
        ${swaps}
      </div>`;
    }).join('');
  }
  function toggleTray(idx) { const t = $('tray-' + idx); if (t) t.classList.toggle('open'); }
  function pickAlt(idx, id) {
    const s = outfit[idx];
    const others = [s.cur, ...s.alts].filter(x => x !== id);
    s.cur = id; s.alts = others;
    renderOutfit();
  }
  function shuffleOutfit() {
    outfit.forEach(s => { if (s.alts.length) { const all = [s.cur, ...s.alts]; const next = all[(all.indexOf(s.cur) + 1) % all.length]; s.cur = next; s.alts = all.filter(x => x !== next); } });
    renderOutfit();
    toast('Reshuffled — still all yours');
  }

  /* wardrobe grid */
  const WFILTERS = ['All','Outerwear','Tops','Bottoms','Shoes','Accessories','Dresses'];
  let wfilter = 'All';
  function renderWardrobe() {
    $('wg-filters').innerHTML = WFILTERS.map(f =>
      `<button class="wg-pill${f === wfilter ? ' active' : ''}" onclick="App.filterWardrobe('${f}')">${f}</button>`).join('');
    const items = WORDER.map(id => ({ id, ...W[id] })).filter(it => wfilter === 'All' || it.group === wfilter);
    $('wg-grid').innerHTML = items.map(it =>
      `<div class="wg-item">
        <div class="wg-img-wrap">
          <img src="${it.img}" style="object-position:${it.pos}" alt="">
          ${it.wears === 0 ? '<span class="wg-owned-badge">Never worn</span>' : ''}
        </div>
        <div class="wg-info"><div class="wg-name">${it.name}</div><div class="wg-metar">${it.brand} · ${it.wears === 0 ? 'New' : it.wears + '× worn'}</div></div>
      </div>`).join('') +
      `<div class="wg-item wg-add" onclick="App.toast('Photograph or upload to add a piece')"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>`;
  }
  function filterWardrobe(f) { wfilter = f; renderWardrobe(); }
  function showWardrobe() { renderWardrobe(); showView('wardrobe-panel', 'Wardrobe'); closeAvatarMenu(); }

  /* ── MODALS / TOAST ────────────────────────────────────────────── */
  function openSheet(id) { $(id).classList.add('open'); }
  function closeSheet(id) { $(id).classList.remove('open'); }
  function openPack() { openSheet('pack-sheet'); }
  function openShare() { openSheet('share-sheet'); }
  let limit = 10;
  function changeLimit(d) {
    limit = Math.max(5, Math.min(15, limit + d));
    $('limit-val').textContent = limit;
    $('limit-fill').style.width = ((limit - 5) / 10 * 100) + '%';
    document.querySelectorAll('.lstop').forEach(el => el.classList.toggle('on', +el.dataset.v === limit));
  }
  function copyLink() {
    navigator.clipboard?.writeText('my-robes.com/board/wimbledon-july').catch(() => {});
    const b = $('copy-btn'); b.textContent = 'Copied ✓'; b.style.color = 'var(--sage)';
    setTimeout(() => { b.textContent = 'Copy link'; b.style.color = ''; }, 1800);
  }
  function openRename() { $('rename-overlay').classList.add('open'); setTimeout(() => $('rename-input').focus(), 60); }
  function closeRename() { $('rename-overlay').classList.remove('open'); }
  function saveRename() {
    const v = $('rename-input').value.trim();
    if (v) { $('mb-out-title').innerHTML = v.replace(/, /, ',<br>'); $('share-name').textContent = v; }
    closeRename(); toast('Renamed');
  }
  let toastT;
  function toast(msg) {
    $('toast-msg').textContent = msg; $('toast').classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.remove('show'), 2400);
  }

  /* ── SHARE PLATFORMS ───────────────────────────────────────────── */
  const PLATFORMS = [
    ['Instagram','<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',false],
    ['Facebook','<path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8V24C19.61 23.03 24 18.06 24 12.07z"/>',true],
    ['WhatsApp','<path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.14-.18.19-.3.29-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.12-.27-.2-.57-.35M12.05 21.78h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.88 9.88M20.46 3.49A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.42z"/>',true],
    ['X','<path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-4.71-6.23-5.4 6.23H2.74l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z"/>',true],
    ['TikTok','<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 1 1 0-5.78c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-7.13 6.29 6.34 6.34 0 0 0 12.67 0V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>',true],
    ['Copy link','<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',false],
  ];
  function renderShare() {
    $('share-platforms').innerHTML = PLATFORMS.map(([label, path, fill]) =>
      `<button class="platform" onclick="App.closeSheet('share-sheet');App.toast('Shared to ${label}')">
        <div class="platform-icon"><svg viewBox="0 0 24 24" ${fill ? 'fill="#202021"' : 'fill="none" stroke="#202021" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'}>${path}</svg></div>
        <span class="platform-label">${label}</span>
      </button>`).join('');
  }

  /* ── AVATAR MENU ───────────────────────────────────────────────── */
  function toggleAvatarMenu(e) { e.stopPropagation(); $('av-menu').classList.toggle('open'); }
  function closeAvatarMenu() { $('av-menu').classList.remove('open'); }
  function replayOnboarding() {
    closeAvatarMenu();
    window.RobesOnboarding.start({ name: userName, onComplete: applyUser });
  }

  /* ── ONBOARDING COMPLETE ───────────────────────────────────────── */
  function applyUser({ name }) {
    if (name && name.trim()) {
      userName = name.trim();
      const first = userName.split(/\s+/)[0];
      const h = new Date().getHours();
      const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
      $('greeting').innerHTML = `${greet},<br>${first}.`;
      $('avatar').textContent = first[0].toUpperCase();
      $('av-name').textContent = first;
    }
    goHome();
  }

  /* ── INIT ──────────────────────────────────────────────────────── */
  function init() {
    // greeting time-of-day
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    $('greeting').innerHTML = `${greet},<br>${userName}.`;
    // composer + pills set by applyComposer (mode-aware)
    renderGallery();
    renderLooks();
    renderWeek();
    renderShare();
    // close menus on outside click / escape
    document.addEventListener('click', () => { closeAvatarMenu(); closeAddMenu(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { ['pack-sheet','share-sheet'].forEach(closeSheet); closeRename(); closeAvatarMenu(); closeAddMenu(); }
    });
    // textarea enter-to-send on home
    $('home-ta').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitHomePrompt(); } });
    goHome();

    // first-run onboarding? off by default (start at home). flag via ?onboard=1
    if (/[?&]onboard=1/.test(location.search)) {
      window.RobesOnboarding.start({ name: '', onComplete: applyUser });
    }
  }

  function usePill(p) {
    if (mode === 'inspire') { $('home-ta').value = PILL_TEXT[p] || p; }
    else { $('home-ta').value = DRESS_PILL_TEXT[p] || p; occasion = PILL_OCC[p] || occasion; }
    $('home-ta').focus();
  }

  function setGenTime(ms) { genTime = ms; }
  /* attach a photo of a key piece to the prompt */
  /* add-image flyout — upload or take a picture */
  function toggleAddMenu(e) { if (e) e.stopPropagation(); $('hp-addmenu').classList.toggle('open'); }
  function closeAddMenu() { const m = $('hp-addmenu'); if (m) m.classList.remove('open'); }
  function pickUpload(e) { if (e) e.stopPropagation(); const inp = $('hp-file'); inp.removeAttribute('capture'); inp.click(); closeAddMenu(); }
  function pickCamera(e) { if (e) e.stopPropagation(); const inp = $('hp-file'); inp.setAttribute('capture', 'environment'); inp.click(); closeAddMenu(); }
  function onPhotoPicked(e) {
    closeAddMenu();
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const box = $('hp-attached');
    box.innerHTML =
      `<div class="hp-chip">` +
        `<img src="${url}" alt="">` +
        `<span class="hp-chip-label">${file.name}</span>` +
        `<button class="hp-chip-x" onclick="App.removePhoto()" aria-label="Remove photo">` +
          `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>` +
        `</button>` +
      `</div>`;
    box.hidden = false;
    e.target.value = '';
  }
  function removePhoto() {
    const box = $('hp-attached');
    box.innerHTML = '';
    box.hidden = true;
  }

  function setName(name) {
    if (!name || !name.trim()) return;
    userName = name.trim();
    const first = userName.split(/\s+/)[0];
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    $('greeting').innerHTML = `${greet},<br>${first}.`;
    $('avatar').textContent = first[0].toUpperCase();
    $('av-name').textContent = first;
  }

  return {
    init, goHome, back, chooseInspire, chooseDressed, setSubtab, setIntent, submitHomePrompt, usePill,
    openCard, openLook, openDay, fillDay, runGetDressed, toggleTray, pickAlt, shuffleOutfit,
    packFromBoard, buildPackingList, openTrip, stylePiece,
    showWardrobe, filterWardrobe, openPack, openShare, closeSheet, changeLimit,
    copyLink, openRename, closeRename, saveRename, toast,
    toggleAvatarMenu, replayOnboarding, setGenTime, setName,
    onPhotoPicked, removePhoto,
    toggleAddMenu, closeAddMenu, pickUpload, pickCamera,
  };
})();
document.addEventListener('DOMContentLoaded', App.init);
