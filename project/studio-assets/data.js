/* ROBES STUDIO — data model: stylist, clients, wardrobes, lookbooks */
(function () {
  const W = n => `images/wimbledon/${n}.png`;

  // garment swatch tones (warm, on-brand) for catalogue pieces without photos
  const T = {
    cream:'#F1EBDF', sand:'#D9C8A6', camel:'#B89A6E', clay:'#BC7F58', terra:'#A4583F',
    blush:'#D8B2AC', sage:'#A9AB85', olive:'#74754F', stone:'#B7B0A2', charcoal:'#3C3B38',
    ink:'#26251F', choc:'#5A4636', ivory:'#EFE7D6', dusk:'#8C7A86',
  };

  // ── Sophie's wardrobe (the showcase client) — mix of real photos + swatches ──
  const SOPHIE_WARDROBE = [
    { id:'s1', name:'Cream check blazer', brand:'Totême', cat:'Outerwear', wears:6, img:W('courtside-hero'), pos:'55% 14%', own:true },
    { id:'s2', name:'White cotton polo', brand:'COS', cat:'Tops', wears:9, img:W('tennis-whites-flatlay'), pos:'12% 12%', own:true },
    { id:'s3', name:'Pleated tennis skirt', brand:'Varley', cat:'Bottoms', wears:4, img:W('tennis-whites-flatlay'), pos:'34% 80%', own:true },
    { id:'s4', name:'Tan leather tote', brand:'Polène', cat:'Bags', wears:22, img:W('tan-tote'), pos:'50% 40%', own:true },
    { id:'s5', name:'Linen midi dress', brand:'Reformation', cat:'Dresses', wears:7, img:W('london-street'), pos:'50% 30%', own:true },
    { id:'s6', name:'Court sneakers', brand:'Common Projects', cat:'Shoes', wears:31, img:W('court-sneakers'), pos:'50% 60%', own:true },
    { id:'s7', name:'Printed silk scarf', brand:'Hermès', cat:'Accessories', wears:5, img:W('silk-scarf'), pos:'50% 40%', own:true },
    { id:'s8', name:'Gold watch & chain', brand:'Cartier', cat:'Accessories', wears:40, img:W('watch-necklace'), pos:'50% 45%', own:true },
    { id:'s9', name:'Linen tank', brand:'Bassike', cat:'Tops', wears:12, img:W('oncourt-tank'), pos:'40% 25%', own:true },
    { id:'s10', name:'Clay linen trousers', brand:'COS', cat:'Bottoms', wears:8, img:W('clay-linen'), pos:'50% 55%', own:true },
    { id:'s11', name:'White linen shirt', brand:'Bassike', cat:'Tops', sw:T.ivory, wears:14, own:true },
    { id:'s12', name:'Wide-leg trousers', brand:'Totême', cat:'Bottoms', sw:T.sand, wears:6, own:true },
    { id:'s13', name:'Navy cashmere knit', brand:'&Daughter', cat:'Tops', sw:T.charcoal, wears:11, own:true },
    { id:'s14', name:'Tailored shorts', brand:'COS', cat:'Bottoms', sw:T.camel, wears:3, own:true },
    { id:'s15', name:'Slip skirt', brand:'Vince', cat:'Bottoms', sw:T.stone, wears:5, own:true },
    { id:'s16', name:'Espadrille flats', brand:'Castañer', cat:'Shoes', sw:T.sand, wears:9, own:true },
    { id:'s17', name:'Straw sun hat', brand:'Lack of Color', cat:'Accessories', sw:T.cream, wears:4, own:true },
    { id:'s18', name:'Trench coat', brand:'Burberry', cat:'Outerwear', sw:T.camel, wears:18, own:true },
    { id:'s19', name:'Poplin shirtdress', brand:'The Row', cat:'Dresses', sw:T.ivory, wears:6, own:true },
    { id:'s20', name:'Leather mules', brand:'Hereu', cat:'Shoes', sw:T.choc, wears:7, own:true },
    { id:'s21', name:'Cotton cardigan', brand:'Sablyn', cat:'Outerwear', sw:T.cream, wears:5, own:true },
    { id:'s22', name:'Pearl drop earrings', brand:'Sophie Bille', cat:'Accessories', sw:T.ivory, wears:13, own:true },
  ];

  // Sophie's lookbooks
  const SOPHIE_LOOKS = [
    { id:'wimbledon', title:'Wimbledon week', occ:'Garden-party week · London · smart-casual', status:'shared', views:7,
      pieceIds:['s1','s2','s3','s4','s6','s7','s5','s10'],
      note:"Pulled this together for the week ahead — everything works back to the linen and the tan. Wear the blazer to the members' enclosure, lose it for the garden. — E" },
    { id:'capsule-summer', title:'Summer capsule', occ:'12 pieces · June–August · work to weekend', status:'shared', views:11,
      pieceIds:['s11','s12','s9','s14','s15','s16','s19','s20','s17','s22'],
      note:'The twelve that do the most this summer. Three you already own, the rest worth adding. — E' },
    { id:'milan', title:'Milan, long weekend', occ:'3 days · gallery openings & dinners', status:'draft', views:0,
      pieceIds:['s18','s13','s12','s20','s8'],
      note:'' },
  ];

  // ── Other clients (lighter, generated wardrobes) ──
  function genWardrobe(seed, tones) {
    const cats = ['Outerwear','Tops','Bottoms','Dresses','Shoes','Bags','Accessories'];
    const names = ['Wool overshirt','Silk blouse','Tailored trousers','Slip dress','Leather boots','Structured bag','Gold hoops',
      'Knit vest','Poplin shirt','Pleated trousers','Wrap dress','Suede loafers','Canvas tote','Linen scarf','Denim jacket','Cashmere tee'];
    const brands = ['COS','Totême','Arket','Vince','The Row','& Other Stories','Sézane','Massimo Dutti'];
    const out = [];
    for (let i = 0; i < seed; i++) {
      out.push({ id:`g${i}`, name:names[(i*3+seed)%names.length], brand:brands[(i*2+seed)%brands.length],
        cat:cats[i%cats.length], sw:tones[i%tones.length], wears:((i*7+seed)%24), own:true });
    }
    return out;
  }

  const CLIENTS = [
    { id:'sophie', name:'Sophie Bennett', initials:'SB', tone:'#BC7F58', aesthetic:'Classic & refined',
      location:'London', since:'Mar 2026', status:'active', onRobes:true,
      thumbs:[W('courtside-hero'),W('london-street'),W('tan-tote'),W('court-sneakers')],
      wardrobe:SOPHIE_WARDROBE, looks:SOPHIE_LOOKS,
      notes:[
        { meta:'Style profile', body:'Dresses for a calendar that swings from <em>members\u2019 enclosures to studio days</em>. Wants polish without fuss. Lives in tailoring, linen, and one good bag. Avoids: logos, anything fussy, cold colour.', tags:['Quiet luxury','Tailoring','Warm neutrals','No logos'] },
        { meta:'Sizing', body:'IT 40 / UK 10. Long in the torso \u2014 midi reads as a touch shorter on her. Half-size up in flats.', tags:['UK 10','Midi → above ankle'] },
        { meta:'Last session · 2 Jun', body:'Built the <em>Wimbledon week</em> capsule from her own pieces, flagged two to add. Shared the moodboard \u2014 she claimed her wardrobe on Robes the same evening.', tags:['Wimbledon week','Claimed wardrobe'] },
      ] },
    { id:'margaux', name:'Margaux Bell', initials:'MB', tone:'#74754F', aesthetic:'Editorial & bold',
      location:'Paris', since:'Apr 2026', status:'invited', onRobes:false,
      thumbs:[], swThumbs:[T.olive,T.terra,T.ink,T.sand],
      wardrobe:genWardrobe(16,[T.olive,T.terra,T.ink,T.sand,T.choc,T.cream]),
      looks:[
        { id:'mb-fw', title:'Fashion week, day to night', occ:'5 days · Paris · shows & dinners', status:'shared', views:2, pieceIds:['g0','g3','g4','g6','g8','g11'], note:'Built around the olive suit. Everything else plays support. — E' },
        { id:'mb-capsule', title:'Workwear capsule', occ:'10 pieces · autumn', status:'draft', views:0, pieceIds:['g1','g2','g9','g13'], note:'' },
      ],
      notes:[{ meta:'Style profile', body:'Not afraid of a statement. Strong silhouettes, deep tones, one unexpected piece per look. Editor, dresses for being seen.', tags:['Bold','Structured','Deep tones'] }] },
    { id:'priya', name:'Priya Anand', initials:'PA', tone:'#A4583F', aesthetic:'Soft minimalist',
      location:'New York', since:'Feb 2026', status:'active', onRobes:true,
      thumbs:[], swThumbs:[T.blush,T.cream,T.stone,T.sand],
      wardrobe:genWardrobe(19,[T.blush,T.cream,T.stone,T.sand,T.ivory,T.dusk]),
      looks:[
        { id:'pa-cap', title:'Capsule, reset', occ:'14 pieces · transitional', status:'shared', views:9, pieceIds:['g0','g2','g4','g7','g10','g13'], note:'A clean reset \u2014 soft colour, everything layers. — E' },
        { id:'pa-trip', title:'Mexico City', occ:'6 days · warm', status:'shared', views:5, pieceIds:['g3','g5','g8','g11','g14'], note:'For the heat \u2014 light, breathable, still pulled-together. — E' },
      ],
      notes:[{ meta:'Style profile', body:'Wants fewer, better. Tonal dressing, soft edges, nothing loud. Building a true capsule with her over the year.', tags:['Minimalist','Tonal','Capsule'] }] },
    { id:'clara', name:'Clara Nguyen', initials:'CN', tone:'#8C7A86', aesthetic:'Romantic & textural',
      location:'London', since:'May 2026', status:'draft', onRobes:false,
      thumbs:[], swThumbs:[T.dusk,T.blush,T.cream,T.choc],
      wardrobe:genWardrobe(11,[T.dusk,T.blush,T.cream,T.choc,T.stone]),
      looks:[], onboarding:true,
      notes:[{ meta:'Onboarding', body:'New client \u2014 wardrobe being catalogued. First session booked for next week.', tags:['New','Cataloguing'] }] },
    { id:'tessa', name:'Tessa Roe', initials:'TR', tone:'#5A4636', aesthetic:'Relaxed tailoring',
      location:'Dublin', since:'Jan 2026', status:'active', onRobes:true,
      thumbs:[], swThumbs:[T.camel,T.choc,T.cream,T.olive],
      wardrobe:genWardrobe(17,[T.camel,T.choc,T.cream,T.olive,T.sand,T.stone]),
      looks:[{ id:'tr-cap', title:'Workwear, softened', occ:'12 pieces · year-round', status:'shared', views:14, pieceIds:['g0','g1','g4','g9','g12'], note:'Tailoring you can actually move in. — E' }],
      notes:[{ meta:'Style profile', body:'Tailoring, but easy. Hates anything stiff. Camel, chocolate, cream. A creative director who lives in good trousers.', tags:['Tailoring','Easy','Camel'] }] },
    { id:'juno', name:'Juno Park', initials:'JP', tone:'#26251F', aesthetic:'Monochrome & sharp',
      location:'Seoul', since:'Mar 2026', status:'active', onRobes:false,
      thumbs:[], swThumbs:[T.ink,T.charcoal,T.stone,T.cream],
      wardrobe:genWardrobe(15,[T.ink,T.charcoal,T.stone,T.cream]),
      looks:[{ id:'jp-cap', title:'Black, white, done', occ:'10 pieces · all season', status:'draft', views:0, pieceIds:['g0','g2','g5','g8'], note:'' }],
      notes:[{ meta:'Style profile', body:'Monochrome only. Sharp lines, no pattern, no warm tones. The most decisive client on the books.', tags:['Monochrome','Sharp','No pattern'] }] },
    { id:'noor', name:'Noor Haddad', initials:'NH', tone:'#A9AB85', aesthetic:'Effortless resort',
      location:'Dubai', since:'Apr 2026', status:'invited', onRobes:false,
      thumbs:[], swThumbs:[T.sage,T.cream,T.sand,T.ivory],
      wardrobe:genWardrobe(13,[T.sage,T.cream,T.sand,T.ivory,T.stone]),
      looks:[{ id:'nh-trip', title:'Riviera, a week', occ:'7 days · resort', status:'shared', views:1, pieceIds:['g1','g3','g6','g9','g12'], note:'Built for sun \u2014 linen, ivory, one good kaftan. — E' }],
      notes:[{ meta:'Style profile', body:'Resort all year. Linen, ivory, gold. Effortless but considered. Travels constantly.', tags:['Resort','Linen','Gold'] }] },
    { id:'imogen', name:'Imogen West', initials:'IW', tone:'#B89A6E', aesthetic:'Quiet & tonal',
      location:'Edinburgh', since:'Feb 2026', status:'active', onRobes:true,
      thumbs:[], swThumbs:[T.stone,T.camel,T.cream,T.sand],
      wardrobe:genWardrobe(18,[T.stone,T.camel,T.cream,T.sand,T.ivory]),
      looks:[{ id:'iw-cap', title:'Tonal year', occ:'15 pieces · all season', status:'shared', views:6, pieceIds:['g0','g3','g6','g9','g12','g15'], note:'One palette, every season. — E' }],
      notes:[{ meta:'Style profile', body:'Tonal dressing taken seriously. Stone, oat, cream. Nothing breaks the palette. An architect.', tags:['Tonal','Neutral','Considered'] }] },
  ];

  window.STUDIO_DATA = {
    stylist:{ name:'Elodie Hart', initials:'EH', mark:'E', tagline:'Personal styling · London', plan:'Studio' },
    clients:CLIENTS,
    tones:T,
  };
})();
