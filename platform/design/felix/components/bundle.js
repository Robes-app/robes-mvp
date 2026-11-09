/* @ds-bundle: {"format": 4, "namespace": "Felix", "components": [{"name": "Icon"}, {"name": "Wordmark"}, {"name": "TopNav"}, {"name": "Dock"}, {"name": "WeekStrip"}, {"name": "ActionDisc"}, {"name": "Button"}, {"name": "Tabs"}, {"name": "PieceList"}, {"name": "Sheet"}, {"name": "SavedLook"}, {"name": "DraftLook"}, {"name": "ImageManager"}, {"name": "AdjustSheet"}, {"name": "TagsView"}, {"name": "SeasonsView"}, {"name": "WornView"}, {"name": "DescribeSheet"}, {"name": "WardrobePicker"}, {"name": "ModelPicker"}, {"name": "ModelStack"}, {"name": "NotificationsSheet"}, {"name": "SettingsView"}, {"name": "AlertDialog"}, {"name": "LookDetails"}, {"name": "WardrobePiece"}, {"name": "FilterChip"}, {"name": "CollectionBar"}, {"name": "LookCard"}, {"name": "PieceTile"}, {"name": "EmptyState"}, {"name": "PageDots"}]} */
(function(){
var React=window.React,h=React.createElement;
var GLYPHS={"link": [["path", {"d": "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"}], ["path", {"d": "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"}]], "inbox": [["path", {"d": "M4 13l2.2-7.2A1.5 1.5 0 0 1 7.6 4.8h8.8a1.5 1.5 0 0 1 1.4 1L20 13v5.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"}], ["path", {"d": "M4 13h4.5l1.2 2.2h4.6l1.2-2.2H20"}]], "photo": [["path", {"d": "M4 8h3.2l1.8-2.6h6l1.8 2.6H20v11H4z"}], ["circle", {"cx": "12", "cy": "13.2", "r": "3.4"}]], "pencil": [["path", {"d": "M14.5 5.5l4 4L8.5 19.5H4.5v-4z"}], ["path", {"d": "M12.5 7.5l4 4"}]], "bookmark": [["path", {"d": "M7 4h10v16l-5-3.5L7 20z"}]], "sparkle": [["path", {"d": "M12 3.5l1.6 4.9 4.9 1.6-4.9 1.6L12 16.5l-1.6-4.9L5.5 10l4.9-1.6z"}], ["path", {"d": "M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"}]], "heart": [["path", {"d": "M12 19.5s-7-4.3-7-9.5a3.8 3.8 0 0 1 7-2.1A3.8 3.8 0 0 1 19 10c0 5.2-7 9.5-7 9.5z"}]], "bag": [["rect", {"x": "5", "y": "11", "width": "14", "height": "9.5", "rx": "0.6"}], ["path", {"d": "M9 11C9 6.5 10.3 4 12 4s3 2.5 3 7"}]], "grid": [["rect", {"x": "4", "y": "4", "width": "6.5", "height": "6.5", "rx": "1"}], ["rect", {"x": "13.5", "y": "4", "width": "6.5", "height": "6.5", "rx": "1"}], ["rect", {"x": "4", "y": "13.5", "width": "6.5", "height": "6.5", "rx": "1"}], ["rect", {"x": "13.5", "y": "13.5", "width": "6.5", "height": "6.5", "rx": "1"}]], "list": [["rect", {"x": "4", "y": "5", "width": "4", "height": "4", "rx": ".8"}], ["rect", {"x": "4", "y": "15", "width": "4", "height": "4", "rx": ".8"}], ["path", {"d": "M11 7h9M11 17h9"}]], "worn": [["rect", {"x": "4", "y": "5.5", "width": "16", "height": "14.5", "rx": "1.5"}], ["path", {"d": "M4 10h16M8.5 3.5v4M15.5 3.5v4"}]], "home": [["path", {"d": "M3 10.5 12 3l9 7.5"}], ["path", {"d": "M5 9.3V21h14V9.3"}]], "lookbook": [["rect", {"x": "3.5", "y": "4.5", "width": "17", "height": "15", "rx": "1.5"}], ["path", {"d": "M12 4.5v15"}]], "diary": [["rect", {"x": "3.5", "y": "5", "width": "17", "height": "15", "rx": "1.5"}], ["path", {"d": "M3.5 10h17"}], ["path", {"d": "M8 3v4M16 3v4"}]], "wardrobe": [["path", {"d": "M12 4.2a1.9 1.9 0 1 0 1.4 3.2"}], ["path", {"d": "M12 7.6 3.6 14.2a1.4 1.4 0 0 0 .9 2.5h15a1.4 1.4 0 0 0 .9-2.5L12 7.6z"}]], "capture": [["path", {"d": "M3.5 8.5A1.5 1.5 0 0 1 5 7h2.5l1.6-2.2h5.8L16.5 7H19a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z"}], ["circle", {"cx": "12", "cy": "13", "r": "3.4"}]], "describe": [["path", {"d": "M10 3C10.6 7.6 12.4 9.4 17 10C12.4 10.6 10.6 12.4 10 17C9.4 12.4 7.6 10.6 3 10C7.6 9.4 9.4 7.6 10 3Z"}], ["path", {"data-fill": "1", "d": "M18 15C18.2 17.1 18.9 17.8 21 18C18.9 18.2 18.2 18.9 18 21C17.8 18.9 17.1 18.2 15 18C17.1 17.8 17.8 17.1 18 15Z"}]], "edit": [["path", {"d": "M4 20h4L19 9l-4-4L4 16z"}]], "bell": [["path", {"d": "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"}], ["path", {"d": "M10 20.5a2 2 0 0 0 4 0"}]], "close": [["path", {"d": "M6 6l12 12M18 6L6 18"}]], "check": [["polyline", {"points": "20 6 9 17 4 12"}]], "chevron": [["path", {"d": "M9 6l6 6-6 6"}]], "back": [["path", {"d": "M15 5l-7 7 7 7"}]], "plus": [["path", {"d": "M12 5v14M5 12h14"}]], "cloud": [["path", {"d": "M7 18.5h10.5a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 7.3 9.6 4.45 4.45 0 0 0 7 18.5z"}]], "sun": [["circle", {"cx": "12", "cy": "12", "r": "4"}], ["path", {"d": "M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"}]], "pin": [["path", {"d": "M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z"}], ["circle", {"cx": "12", "cy": "10", "r": "2"}]], "rain": [["path", {"d": "M3 12a9 9 0 0 1 18 0z"}], ["path", {"d": "M12 12v6.5a2 2 0 0 1-4 0"}]], "forward": [["path", {"d": "M9 5l7 7-7 7"}]], "refresh": [["path", {"d": "M20 11a8 8 0 0 0-14.3-4.9L4 8"}], ["path", {"d": "M4 3.5V8h4.5"}], ["path", {"d": "M4 13a8 8 0 0 0 14.3 4.9L20 16"}], ["path", {"d": "M20 20.5V16h-4.5"}]], "spring": [["path", {"d": "M12 21v-9"}], ["path", {"d": "M12 12C12 8 9 5 5 5c0 4 3 7 7 7z"}], ["path", {"d": "M12 10c0-3.3 2.7-6 6-6c0 3.3-2.7 6-6 6z"}]], "summer": [["path", {"d": "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z"}], ["path", {"d": "M12 2v2M12 20v2M2 12h2M20 12h2"}], ["path", {"d": "M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"}]], "autumn": [["path", {"d": "M5 19C5 11 10 5 20 4c-1 10-7 15-15 15z"}], ["path", {"d": "M5 19l8-8"}]], "winter": [["path", {"d": "M12 2v20"}], ["path", {"d": "M3.3 7l17.4 10M3.3 17l17.4-10"}], ["path", {"d": "M9 4l3 2 3-2M9 20l3-2 3 2"}]], "tag": [["path", {"d": "M3 12V4h8l10 10-8 8z"}], ["circle", {"cx": "7.5", "cy": "8.5", "r": "1.3"}]], "camera": [["path", {"d": "M3 8h4l2-3h6l2 3h4v11H3z"}], ["circle", {"cx": "12", "cy": "13", "r": "3.5"}]], "search": [["circle", {"cx": "11", "cy": "11", "r": "6"}], ["path", {"d": "M15.5 15.5 20 20"}]], "receipt": [["path", {"d": "M6 3h12v18l-3-2-3 2-3-2-3 2z"}], ["path", {"d": "M9 8h6M9 12h6"}]], "calendar": [["rect", {"x": "3", "y": "5", "width": "18", "height": "16", "rx": "2"}], ["path", {"d": "M3 10h18"}]], "star": [["path", {"d": "M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z"}]]};
function cx(){return Array.prototype.filter.call(arguments,Boolean).join(' ');}
function Icon(p){var g=GLYPHS[p.name]||[];var s=p.size||20;
  return h('svg',{className:cx('fx-ico',p.className),viewBox:'0 0 24 24',width:s,height:s,strokeWidth:p.stroke||1.5,'aria-hidden':p.label?undefined:'true',role:p.label?'img':undefined,'aria-label':p.label},
    g.map(function(e,i){var a=Object.assign({key:i},e[1]);return h(e[0],a);}));}
function Wordmark(p){return h('span',{className:cx('fx-wordmark',p.className),style:p.style},p.children||'Robes');}
function TopNav(p){var desktop=p.variant==='desktop';
  var links=p.links||['Lookbook','Diary','Wardrobe'];
  var avatar=p.noProfile?null:h('button',{className:'fx-avatar',title:'Settings',onClick:p.onProfile},p.initial||'A');
  if(desktop){var w=p.weather;
    return h('nav',{className:'fx-nav fx-nav-desktop'},h('div',{className:'fx-nav-in'},
      h('div',{className:'fx-nav-l'},h(Wordmark,null),h('div',{className:'fx-nav-links'},links.map(function(l){return h('button',{key:l,className:'fx-nav-link','aria-current':p.current===l?'page':undefined,onClick:function(){p.onNavigate&&p.onNavigate(l);}},l);}))),
      h('div',{className:'fx-nav-r'},w?h('div',{className:'fx-wx'},h(Icon,{name:w.icon||'cloud',size:14}),h('span',null,w.day),h('span',{className:'fx-wx-dot'}),h('span',null,w.place),h('span',{className:'fx-wx-dot'}),h('span',null,w.temp)):null,avatar)));}
  var t=p.title,sw=!!p.swapMark,st=React.useState(true),greet=!sw||st[0];
  React.useEffect(function(){if(!sw)return;var id=setTimeout(function(){st[1](false);},p.swapAfter||5000);return function(){clearTimeout(id);};},[sw,st[0]]);
  var inset=(p.bell?96:66)+'px';
  var left=t?h('div',{className:'fx-nav-lead'},p.mark?h('span',{className:'fx-nav-mark','aria-label':'Robes'},'R'):null,p.onBack?h('button',{className:'fx-nav-back',title:'Back','aria-label':'Back',onClick:p.onBack},h(Icon,{name:'back',size:20,stroke:1.4})):null):h(Wordmark,null);
  var centre=t?h('div',{className:'fx-nav-centre',style:{left:inset,right:inset}},
      h('span',{className:'fx-nav-title',style:{opacity:greet?1:0}},t),
      sw?h('span',{className:'fx-nav-swap',style:{opacity:greet?0:1},'aria-hidden':true},h(Wordmark,null)):null,
      sw?h('button',{className:'fx-nav-tap',title:'Robes','aria-label':greet?'Show wordmark':'Show greeting',onClick:function(){st[1](!greet);}}):null):null;
  return h('nav',{className:cx('fx-nav',p.glass&&'fx-nav-glass')},h('div',{className:'fx-nav-in'},left,centre,
    h('div',{className:'fx-nav-r'},p.bell?h('button',{className:'fx-bell',title:'Notifications',onClick:p.onBell},h(Icon,{name:'bell',size:17,stroke:1.2}),p.alert?h('span',{className:'fx-bell-dot'}):null):null,
      p.onAdd?h('button',{className:'fx-nav-add',title:p.addLabel||'Add','aria-label':p.addLabel||'Add',onClick:p.onAdd},h(Icon,{name:'plus',size:13,stroke:1.6})):null,avatar)));}
var DOCK=[['home','Home'],['lookbook','Lookbook'],['diary','Diary'],['wardrobe','Wardrobe']];
function Dock(p){var a=p.active||'home',dots=p.dots||{},badges=p.badges||{};
  return h('div',{className:'fx-dock-wrap'},h('nav',{className:'fx-dock'},DOCK.map(function(d){var bd=badges[d[0]];if(bd!=null&&typeof bd!=='object')bd={count:bd};
    return h('button',{key:d[0],className:'fx-dock-item','aria-current':a===d[0]?'page':undefined,onClick:function(){p.onSelect&&p.onSelect(d[0]);}},
      h('span',{className:'fx-dock-bar'}),dots[d[0]]&&!bd?h('span',{className:'fx-dock-dot'}):null,
      bd?h('span',{className:cx('fx-dock-badge',bd.tone==='alert'&&'fx-dock-badge-alert'),title:bd.title},String(bd.count)):null,
      h(Icon,{name:d[0],size:20}),d[1]);})));}
function WeekStrip(p){var days=p.days||[];
  return h('div',{className:'fx-week',role:'group','aria-label':'Week'},days.map(function(d,i){
    var on=d.today||p.selected===i;
    return h('button',{key:i,className:cx('fx-day',d.future&&'fx-day-future'),'aria-current':on?'date':undefined,onClick:function(){p.onSelect&&p.onSelect(i);}},
      h('span',{className:'fx-day-w'},d.today?'Today':d.w),h('span',{className:'fx-day-n'},d.n),
      h('span',{className:'fx-day-marks'},(d.worn?['worn']:Array(d.looks||0).fill('planned')).map(function(m,j){return h('span',{key:j,className:'fx-mark fx-mark-'+m});})));}));}
function ActionDisc(p){return h('button',{className:cx('fx-disc',p.className),title:p.title||p.label,onClick:p.onClick},
  h('span',{className:'fx-disc-face'},h(Icon,{name:p.icon,size:19})),h('span',{className:'fx-disc-label'},p.label));}
function Button(p){var v=p.variant||'primary';
  return h('button',{type:p.type||'button',className:cx('fx-btn','fx-btn-'+v,p.block&&'fx-btn-block',p.className),onClick:p.onClick,disabled:p.disabled},p.children,p.icon?h(Icon,{name:p.icon,size:11}):null);}
function Tabs(p){var items=p.items||[];
  return h('div',{className:'fx-tabs',role:'tablist'},items.map(function(t){return h('button',{key:t,role:'tab',className:'fx-tab','aria-selected':p.value===t?'true':'false',onClick:function(){p.onChange&&p.onChange(t);}},t);}),h('span',{style:{flex:1}}));}
function PieceList(p){var items=p.items||[],ed=p.editing!=null?!!p.editing:p.mode==='edit',grid=p.view==='grid',sw=p.swiped!=null?p.swiped:-1,n=items.length;
  var call=function(f,i){return function(e){if(e&&e.stopPropagation)e.stopPropagation();f&&f(i);};};
  var meta=function(it,cls){return h('span',{className:cls},
      it.price?h(React.Fragment,null,it.wishlist?h(Icon,{name:'heart',size:11,stroke:1.5,className:'fx-pl-fill',label:'On your wishlist'}):null,it.shop?h(Icon,{name:'bag',size:11,stroke:1.6,label:'From the shop'}):null,h('span',null,it.price)):null,
      !it.price&&it.worn!=null?h('span',{className:'fx-pl-worn',title:'Times worn'},h(Icon,{name:'worn',size:12,stroke:1.5}),String(it.worn)):null);};
  var edBtns=function(i,cls){return [h('button',{key:'s',className:cls,title:'Swap','aria-label':'Swap',onClick:call(p.onSwap,i)},h(Icon,{name:'wardrobe',size:13,stroke:1.5})),
      h('button',{key:'r',className:cls,title:'Remove','aria-label':'Remove',onClick:call(p.onRemove,i)},h(Icon,{name:'close',size:13,stroke:1.6}))];};
  var head=p.title!==null&&n?h('div',{className:'fx-pl-head'},h('span',{className:'fx-pl-title'},p.title||'Included pieces'),
      h('span',{className:'fx-pl-tools'},
        h('span',{className:'fx-vtoggle',role:'group','aria-label':'View'},[['grid','Grid view'],['list','List view']].map(function(v){return h('button',{key:v[0],title:v[1],'aria-label':v[1],'aria-pressed':(grid?'grid':'list')===v[0],onClick:function(){p.onView&&p.onView(v[0]);}},h(Icon,{name:v[0],size:15,stroke:1.5}));})),
        h('button',{className:cx('fx-pl-edit',ed&&'fx-pl-edit-on'),title:ed?'Done editing':'Edit pieces','aria-label':ed?'Done editing':'Edit pieces','aria-pressed':ed,onClick:p.onEditToggle},h(Icon,{name:'pencil',size:15,stroke:1.5})))):null;
  var add=p.onAdd?h('button',{className:'fx-pl-add',title:'Add pieces','aria-label':'Add pieces',onClick:p.onAdd},h(Icon,{name:'plus',size:11,stroke:1.9}),h(Icon,{name:'wardrobe',size:15,stroke:1.5})):null;
  var body=grid?h('div',{className:'fx-pl-grid'},items.map(function(it,i){
      return h('div',{key:i,className:'fx-pl-tile',role:'button',tabIndex:0,title:'View piece',onClick:call(p.onOpen,i)},
        h('div',{className:'fx-pl-tile-ph'},it.img?h('img',{src:it.img,alt:''}):null,ed?h('div',{className:'fx-pl-tile-ed'},edBtns(i,'fx-pl-tile-btn')):null),
        h('div',{className:'fx-pl-cat'},it.category),h('div',{className:'fx-pl-tname'},it.name),meta(it,'fx-pl-meta'));}),
      add?h('div',{className:'fx-pl-gslot'},add):null)
    :h(React.Fragment,null,h('div',{className:'fx-pl-list'},items.map(function(it,i){
      return h('div',{key:i,className:'fx-pl-row'},
        h('div',{className:'fx-pl-acts','aria-hidden':sw!==i},
          h('button',{className:'fx-pl-swap',onClick:call(p.onSwap,i),tabIndex:sw===i?0:-1},h(Icon,{name:'wardrobe',size:16,stroke:1.5}),'Swap'),
          h('button',{className:'fx-pl-rm',onClick:call(p.onRemove,i),tabIndex:sw===i?0:-1},h(Icon,{name:'close',size:16,stroke:1.6}),'Remove')),
        h('div',{className:'fx-pl-front',role:'button',tabIndex:0,onClick:call(p.onOpen,i),style:{transform:sw===i?'translateX(-144px)':'none'}},
          h('span',{className:'fx-pl-img'},it.img?h('img',{src:it.img,alt:''}):null),
          h('div',{className:'fx-pl-body'},h('div',{className:'fx-pl-cat'},it.category),h('div',{className:'fx-pl-name'},it.name),it.brand?h('div',{className:'fx-pl-brand'},it.brand):null),
          meta(it,'fx-pl-meta fx-pl-meta-r'),
          ed?h('span',{className:'fx-pl-edbtns'},edBtns(i,'fx-pl-sq')):h(Icon,{name:'forward',size:14,stroke:1.6,className:'fx-pl-go'})));})),
      add?h('div',{className:'fx-pl-below'},add):null);
  return h('div',{className:'fx-pl'},head,body);}
function Sheet(p){var acts=p.actions||(p.rows||[]).map(function(r){return {icon:r.icon,label:r.label,onClick:r.onClick};}),title=p.title||p.question,act=p.active;
  return h('div',{className:'fx-sheet',role:'dialog','aria-label':title},
    h('div',{className:'fx-sheet-head'},
      h('button',{className:'fx-sheet-x',title:'Cancel','aria-label':'Cancel',onClick:p.onClose},h(Icon,{name:'close',size:15,stroke:2})),
      p.header||h('span',{className:'fx-sheet-t'},title),
      p.headerAction||h('span',{className:'fx-sheet-sp'})),
    acts.length?h('div',{className:'fx-sheet-acts',style:{gridTemplateColumns:'repeat('+acts.length+',minmax(0,1fr))'}},acts.map(function(a,i){var k=a.key||a.label,on=act!=null&&act===k,dim=act!=null&&!on;
      return h('button',{key:k,className:cx('fx-sheet-act',on&&'fx-sheet-act-on',dim&&'fx-sheet-act-dim'),'aria-pressed':act!=null?on:undefined,onClick:a.onClick},
        h(Icon,{name:a.icon,size:17,stroke:a.icon==='describe'||a.icon==='sparkle'?1.4:1.5}),h('span',{className:'fx-sheet-act-l'},a.label),
        a.count?h('span',{className:'fx-sheet-n'},String(a.count)):null);})):null,
    p.children);}
function SavedLook(p){var imgs=p.images&&p.images.length?p.images:(p.image?[p.image]:[]);var cur=imgs[0],mid=imgs[1];
  return h('div',{className:cx('fx-saved',p.className),style:p.style},
    cur?h('img',{className:'fx-saved-img',src:cur,alt:p.alt||''}):null,
    p.onBack!==null?h('button',{className:'fx-saved-back',title:'Back','aria-label':'Back',onClick:p.onBack},h(Icon,{name:'back',size:20,stroke:1.4})):null,
    p.onAdjust!==null?h('button',{className:'fx-saved-adjust',title:p.adjustLabel||'Adjust model image','aria-label':p.adjustLabel||'Adjust model image',onClick:p.onAdjust},h(Icon,{name:'describe',size:13,stroke:1.6})):null,
    p.onImages!==null?h('button',{className:'fx-saved-stack',title:'Images of this look','aria-label':'Images of this look',onClick:p.onImages},
      h('span',{className:'fx-stack-back'}),
      h('span',{className:'fx-stack-mid'},mid?h('img',{src:mid,alt:''}):null),
      h('span',{className:'fx-stack-front'},cur?h('img',{src:cur,alt:''}):null),
      h('span',{className:'fx-stack-badge'},p.count>1?String(p.count):h(Icon,{name:'plus',size:10,stroke:2.6}))):null);}
var SEASONS=['Spring','Summer','Autumn','Winter'];
function DrillRow(p){return h('button',{className:'fx-drill-row',onClick:p.onClick},h('span',{className:'fx-drill-k'},p.label),h('span',{className:cx('fx-drill-v',p.muted&&'fx-drill-muted')},p.value),p.trail||h(Icon,{name:'forward',size:14,stroke:1.6,className:'fx-drill-go'}));}
function DraftLook(p){var pieces=p.pieces||[],n=pieces.length,edit=p.mode==='edit',gen=!!p.generating;
  var st=React.useState(p.prompt||''),txt=p.prompt!=null?p.prompt:st[0];
  var tab=p.tab||'Pieces',canSave=!!p.canSave&&!gen,canGen=p.canGenerate!=null?p.canGenerate:(!!(txt&&txt.trim())||n>0||!!p.context);
  var ctx=p.context,dt=p.details||{},tags=dt.tags||[],seas=(dt.seasons||[]).filter(function(s){return SEASONS.indexOf(s)>=0;});
  var many=seas.length>2;
  var details=h(LookDetails,{tags:tags,seasons:seas,worn:dt.worn,caption:dt.caption,captionEditing:p.captionEditing,onTags:p.onTags,onSeasons:p.onSeasons,onWorn:p.onWorn,onCaption:p.onCaption,onCaptionChange:p.onCaptionChange,onCaptionSave:p.onCaptionSave});
  return h('div',{className:cx('fx-draft',p.className),style:p.style},
    h('div',{className:'fx-draft-head'},
      h('button',{className:'fx-draft-close',title:edit?'Discard changes':'Discard draft','aria-label':edit?'Discard changes':'Discard draft',onClick:p.onClose},h(Icon,{name:'close',size:14,stroke:1.6})),
      h('span',{className:'fx-draft-ttl'},p.title||(edit?'Edit look':'Draft look')),
      h('button',{className:'fx-draft-done',title:'Save and schedule for this day','aria-label':'Done',disabled:!canSave,onClick:p.onDone},h(Icon,{name:'check',size:15,stroke:2}))),
    h('div',{className:'fx-draft-body'},
      h('div',{className:cx('fx-draft-photo',gen&&'fx-draft-gen-on')},p.managing?h(ImageManager,{images:p.images||(p.image?[p.image]:[]),onRemove:p.onRemoveImage,onAddPhoto:p.onAddPhoto,onDone:p.onManageDone}):h(SavedLook,{image:p.image,images:p.images,count:p.count,alt:p.alt,onBack:null,onAdjust:p.onAdjust,onImages:p.onImages,adjustLabel:p.adjustLabel})),
      h('div',{className:'fx-draft-tabs'},h(Tabs,{items:['Pieces','Details'],value:tab,onChange:p.onTab})),
      h('div',{className:cx('fx-draft-panel',gen&&'fx-draft-locked')},
        tab==='Pieces'?h(React.Fragment,null,
          h('div',{className:'fx-draft-pieces'},
            n?h(PieceList,{items:pieces,mode:'edit',title:null,onSwap:p.onSwap,onRemove:p.onRemove}):null,
            h('button',{className:cx('fx-draft-slot',n&&'fx-draft-slot-joined'),title:'Add pieces','aria-label':'Add pieces',onClick:p.onAddPiece},
              h('span',null,h(Icon,{name:n?'plus':'wardrobe',size:n?13:15,stroke:n?1.7:1.5})))),
          h('div',{className:'fx-draft-prompt'},
            ctx||p.onAddContext?h('div',{className:'fx-draft-chips'},ctx?h('span',{className:'fx-ctx-chip'},
              h(Icon,{name:'pin',size:11}),h('span',null,ctx.place),
              ctx.range?h(React.Fragment,null,h('span',{className:'fx-ctx-sep'},'·'),h(Icon,{name:ctx.weather||'cloud',size:11,stroke:1.6}),h('span',null,ctx.range)):null,
              p.onRemoveContext!==null?h('button',{className:'fx-ctx-x',title:'Leave the weather out','aria-label':'Leave the weather out',onClick:p.onRemoveContext},h(Icon,{name:'close',size:9,stroke:1.8})):null)
              :h('button',{className:'fx-ctx-add',title:'Add location & weather','aria-label':'Add location and weather',onClick:p.onAddContext},h(Icon,{name:'pin',size:11}),h(Icon,{name:'plus',size:10,stroke:2}))):null,
            h('div',{className:'fx-draft-input'},h('input',{value:txt,placeholder:p.placeholder||(edit?'Describe other changes…':'Describe Look…'),'aria-label':'Describe the look',
              onChange:function(e){st[1](e.target.value);p.onPromptChange&&p.onPromptChange(e.target.value);},
              onKeyDown:function(e){if(e.key==='Enter'&&canGen&&p.onGenerate)p.onGenerate(txt);}}))),
          h('div',{className:'fx-draft-gen'},h('button',{className:'fx-btn fx-btn-chip',disabled:!canGen,onClick:function(){p.onGenerate&&p.onGenerate(txt);}},
            p.generateLabel||(edit?'Regenerate':'Generate'),h(Icon,{name:edit?'refresh':'check',size:11,stroke:edit?2:2.2}))))
        :(p.children||details))),
    p.sheet==='adjust'?h('div',{className:'fx-draft-float'},h(AdjustSheet,{sending:gen,onSend:p.onAdjustSend,onClose:p.onSheetClose})):null,
    p.sheet==='describe'?h('div',{className:'fx-draft-float'},h(DescribeSheet,{pieces:pieces,expanded:p.describeExpanded,onExpand:p.onDescribeExpand,onCollapse:p.onDescribeCollapse,onRemovePiece:p.onDescribeRemovePiece,onSend:p.onDescribeSend,onClose:p.onSheetClose})):null,
    p.sheet==='wardrobe'?h(WardrobePicker,{items:p.wardrobe||[],category:p.wardrobeCategory,onCategory:p.onWardrobeCategory,query:p.wardrobeQuery,onQuery:p.onWardrobeQuery,onToggle:p.onWardrobeToggle,onPhotograph:p.onPhotograph,onConfirm:p.onWardrobeConfirm,onBack:p.onSheetClose}):null,
    p.sheet==='tags'?h(TagsView,{tags:p.tagOptions||tags.map(function(t){return {t:t,on:true};}),onBack:p.onSheetClose,onToggle:p.onTagToggle,onDelete:p.onTagDelete,onAdd:p.onTagAdd}):null,
    p.sheet==='seasons'?h(SeasonsView,{value:seas,onBack:p.onSheetClose,onChange:p.onSeasonsChange}):null,
    p.sheet==='worn'?h(WornView,{dates:p.wornDates||[],onBack:p.onSheetClose,onRemove:p.onWornRemove,onAdd:p.onWornAdd}):null,
    p.confirm?h(AlertDialog,{title:edit?'Discard your changes?':'Discard this draft?',message:edit?'The look stays as it was.':'The look won\u2019t be saved or scheduled.',onDismiss:p.onKeepEditing,
      actions:[{label:'Discard',variant:'primary',onClick:p.onConfirmDiscard},{label:'Keep editing',variant:'outline',onClick:p.onKeepEditing}]}):null,
    p.choose?h(AlertDialog,{title:'Save your changes',message:'Update this look, or keep the original and save this as a new look.',onDismiss:p.onChooseCancel,
      actions:[{label:'Update',variant:'primary',onClick:p.onUpdate},{label:'Save as new Look',variant:'outline',onClick:p.onSaveNew},{label:'Cancel',variant:'text',onClick:p.onChooseCancel}]}):null);}
function ImageManager(p){var imgs=p.images||[],rm=p.removable!=null?p.removable:imgs.length>1;
  return h('div',{className:'fx-mgr'},
    h('div',{className:'fx-mgr-strip'},imgs.map(function(src,i){return h('div',{key:i,className:'fx-mgr-card'},h('img',{src:src,alt:''}),
        rm?h('button',{className:'fx-mgr-rm',title:'Remove this image','aria-label':'Remove this image',onClick:function(){p.onRemove&&p.onRemove(i);}},h(Icon,{name:'close',size:12,stroke:1.6})):null);}),
      h('button',{className:'fx-mgr-add',title:'Add a photo',onClick:p.onAddPhoto},h('span',{className:'fx-mgr-add-disc'},h(Icon,{name:'camera',size:22,stroke:1.3})),h('span',{className:'fx-mgr-add-l'},'Add a photo'))),
    h('button',{className:'fx-mgr-done',title:'Done','aria-label':'Done',onClick:p.onDone},h(Icon,{name:'check',size:18,stroke:2})));}
function AdjustSheet(p){var st=React.useState(p.value||''),v=p.value!=null?p.value:st[0],busy=!!p.sending,can=!!(v&&v.trim())&&!busy;
  function send(){if(can&&p.onSend)p.onSend(v);}
  return h('div',{className:'fx-adj',role:'dialog','aria-label':p.title||'Adjust Model Image'},
    h('div',{className:'fx-adj-head'},h('span',{className:'fx-adj-ttl'},p.title||'Adjust Model Image'),
      h('button',{className:'fx-adj-x',title:'Close','aria-label':'Close',onClick:p.onClose},h(Icon,{name:'close',size:14,stroke:1.6}))),
    h('div',{className:'fx-adj-field'},
      h('input',{value:v,placeholder:p.placeholder||'e.g: sleeves rolled up…','aria-label':p.title||'Adjust model image',
        onChange:function(e){st[1](e.target.value);p.onChange&&p.onChange(e.target.value);},onKeyDown:function(e){if(e.key==='Enter')send();}}),
      h('button',{className:'fx-adj-send',title:busy?'Generating':'Send','aria-label':busy?'Generating':'Send',disabled:!can,onClick:send},
        busy?h('span',{className:'fx-spin-rev'},h(Icon,{name:'refresh',size:14,stroke:2})):'→')));}
function SubView(p){return h('div',{className:'fx-sub',role:'dialog','aria-label':p.title},
  h('div',{className:'fx-sub-head'},h('button',{className:'fx-sub-back',title:'Back','aria-label':'Back',onClick:p.onBack},h(Icon,{name:'back',size:20,stroke:1.4})),
    h('span',{className:'fx-sub-ttl'},p.title),h('span',{className:'fx-sub-sp'})),
  h('div',{className:'fx-sub-body'},p.children),p.footer?h('div',{className:'fx-sub-foot'},p.footer):null);}
function TagsView(p){var tags=p.tags||[],sw=React.useState(p.swiped!=null?p.swiped:-1),x0=React.useRef(null),nv=React.useState(''),val=nv[0];
  function add(){var t=val.trim();if(t&&p.onAdd){p.onAdd(t);nv[1]('');}}
  return h(SubView,{title:'Tags',onBack:p.onBack,footer:h('div',{className:'fx-tag-add'},h(Icon,{name:'tag',size:13,className:'fx-tag-ico'}),
      h('input',{value:val,placeholder:'Add a tag','aria-label':'Add a tag',onChange:function(e){nv[1](e.target.value);},onKeyDown:function(e){if(e.key==='Enter')add();}}),
      h('button',{className:'fx-tag-ok',title:'Add tag','aria-label':'Add tag',disabled:!val.trim(),onClick:add},h(Icon,{name:'check',size:15,stroke:1.8})))},
    h('div',{className:'fx-list'},tags.map(function(t,i){var open=sw[0]===i;
      return h('div',{key:t.t,className:'fx-tag-wrap'},
        h('button',{className:'fx-tag-del',tabIndex:open?0:-1,onClick:function(){sw[1](-1);p.onDelete&&p.onDelete(i);}},'Delete'),
        h('div',{className:'fx-tag-row',role:'checkbox','aria-checked':!!t.on,tabIndex:0,style:{transform:open?'translateX(-88px)':'none'},
          onPointerDown:function(e){x0.current=e.clientX;},
          onPointerUp:function(e){var dx=x0.current==null?0:e.clientX-x0.current;x0.current=null;if(dx<-40){sw[1](i);}else if(dx>40||open){sw[1](-1);}else{p.onToggle&&p.onToggle(i);}},
          onKeyDown:function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();p.onToggle&&p.onToggle(i);}else if(e.key==='Delete'||e.key==='Backspace'){p.onDelete&&p.onDelete(i);}}},
          h('span',{className:'fx-opt-t'},t.t),h('span',{className:'fx-opt-ok',style:{opacity:t.on?1:0}},h(Icon,{name:'check',size:15,stroke:1.8}))));})));}
function SeasonsView(p){var v=p.value||[],opts=[[null,'Year Round']].concat(SEASONS.map(function(s){return [s,s];}));
  return h(SubView,{title:'Seasons',onBack:p.onBack},h('div',{className:'fx-list'},opts.map(function(o){var on=o[0]?v.indexOf(o[0])>=0:!v.length;
    return h('button',{key:o[1],className:'fx-opt',role:'checkbox','aria-checked':on,onClick:function(){if(!p.onChange)return;if(!o[0])p.onChange([]);else p.onChange(on?v.filter(function(x){return x!==o[0];}):SEASONS.filter(function(s){return s===o[0]||v.indexOf(s)>=0;}));}},
      o[0]?h(Icon,{name:o[0].toLowerCase(),size:18,stroke:1.4,className:'fx-opt-ico'}):null,h('span',{className:'fx-opt-t'},o[1]),
      h('span',{className:'fx-opt-ok',style:{opacity:on?1:0}},h(Icon,{name:'check',size:15,stroke:1.8})));})));}
function WornView(p){var d=p.dates||[],n=d.length;
  return h(SubView,{title:n?'Worn · '+n+(n===1?' time':' times'):'Worn',onBack:p.onBack,footer:h('button',{className:'fx-worn-add',onClick:p.onAdd},h(Icon,{name:'plus',size:14}),'Add a date')},
    n?h('div',{className:'fx-worn'},d.map(function(w,i){return h('div',{key:i,className:'fx-worn-row'},h('span',{className:'fx-worn-d'},w.date),h('span',{className:'fx-worn-n'},w.note||'Worn as saved'),
      h('button',{className:'fx-worn-x',title:'Remove this date','aria-label':'Remove '+w.date,onClick:function(){p.onRemove&&p.onRemove(i);}},'×'));}))
     :h('div',{className:'fx-worn-none'},'Not worn yet'));}
function DescribeSheet(p){var pcs=p.pieces||[],n=pcs.length,st=React.useState(p.value||''),v=p.value!=null?p.value:st[0];
  var ready=p.canSend!=null?p.canSend:!!(v&&v.trim()),ex=!!p.expanded;
  function send(){if(ready&&p.onSend)p.onSend(v);}
  var chip=function(open){return h('span',{className:cx('fx-pp-count',n&&'fx-pp-on'),title:'Pieces in this look'},h(Icon,{name:'wardrobe',size:13}),h('span',null,String(n)),
    h('button',{className:'fx-pp-tog',title:open?'Hide pieces':'Show pieces','aria-label':open?'Hide pieces':'Show pieces',onClick:open?p.onCollapse:p.onExpand},h(Icon,{name:open?'chevron':'back',size:11,stroke:1.8})));};
  return h('div',{className:'fx-adj',role:'dialog','aria-label':p.title||'Describe changes'},
    h('div',{className:'fx-adj-head'},h('span',{className:'fx-adj-ttl'},p.title||'Describe changes'),
      h('button',{className:'fx-adj-x',title:'Close','aria-label':'Close',onClick:p.onClose},h(Icon,{name:'close',size:14,stroke:1.6}))),
    h('div',{className:'fx-pp-card'},
      h('div',{className:'fx-pp-chips'},chip(ex),ex?pcs.map(function(pc,i){return h('span',{key:pc.name,className:'fx-pp-piece'},h('span',{className:'fx-pp-av'},pc.img?h('img',{src:pc.img,alt:''}):null),pc.name,
        h('button',{className:'fx-pp-rm',title:'Remove from prompt','aria-label':'Remove '+pc.name+' from prompt',onClick:function(){p.onRemovePiece&&p.onRemovePiece(i);}},h(Icon,{name:'close',size:10,stroke:1.8})));}):null),
      h('div',{className:'fx-pp-row'},h('input',{value:v,placeholder:p.placeholder||'e.g: more casual…','aria-label':'Describe changes',
          onChange:function(e){st[1](e.target.value);p.onChange&&p.onChange(e.target.value);},onKeyDown:function(e){if(e.key==='Enter')send();}}),
        h('button',{className:'fx-pp-send',title:'Send','aria-label':'Send',disabled:!ready,onClick:send},'→'))));}
var WCATS=['All','Tops','Knitwear','Bottoms','Outerwear','Shoes','Bags'];
function WardrobePicker(p){var items=p.items||[],cat=p.category||'All',q=p.query!=null?p.query:'';
  var shown=items.map(function(it,i){return [it,i];}).filter(function(x){return (cat==='All'||x[0].cat===cat)&&(!q||x[0].name.toLowerCase().indexOf(q.toLowerCase())>=0);});
  var picked=items.filter(function(it){return it.on;}).length,ready=p.ready!=null?p.ready:picked>0;
  var cta=p.ctaLabel||(picked?'Add '+picked+(picked===1?' Piece':' Pieces'):'Add Pieces');
  return h('div',{className:'fx-sub fx-wp',role:'dialog','aria-label':'Your wardrobe'},
    h('div',{className:'fx-wp-top'},
      h('div',{className:'fx-wp-bar'},h('button',{className:'fx-sub-back fx-wp-back',title:'Back','aria-label':'Back',onClick:p.onBack},h(Icon,{name:'back',size:20,stroke:1.4})),
        h('div',{className:'fx-wp-search'},h(Icon,{name:'search',size:13,stroke:1.6}),h('input',{value:q,placeholder:'Search your wardrobe','aria-label':'Search your wardrobe',onChange:function(e){p.onQuery&&p.onQuery(e.target.value);}}))),
      h('div',{className:'fx-wp-cats'},(p.categories||WCATS).map(function(c){var on=c===cat,nn=c==='All'?items.length:items.filter(function(it){return it.cat===c;}).length;
        return h('button',{key:c,className:cx('fx-wp-cat',on&&'fx-wp-cat-on'),'aria-pressed':on,onClick:function(){p.onCategory&&p.onCategory(c);}},(on&&c!=='All'?'✓ ':'')+c,h('span',{className:'fx-wp-n'},nn));}))),
    h('div',{className:'fx-wp-body'},h('div',{className:'fx-wp-grid'},
      h('div',{className:'fx-wp-item'},h('button',{className:'fx-wp-photo',onClick:p.onPhotograph},h(Icon,{name:'camera',size:18,stroke:1.3}),h('span',null,'Photograph',h('br'),'one')),h('div',{className:'fx-wp-hint'},'Adds straight in')),
      shown.map(function(x){var it=x[0],i=x[1];return h('button',{key:it.name,className:'fx-wp-item',role:'checkbox','aria-checked':!!it.on,onClick:function(){p.onToggle&&p.onToggle(i);}},
        h('span',{className:cx('fx-wp-img',it.on&&'fx-wp-img-on')},h('img',{src:it.img,alt:''}),h('span',{className:cx('fx-wp-tick',it.on&&'fx-wp-tick-on')},it.on?'✓':'')),
        h('span',{className:'fx-wp-name'},it.name));}))),
    h('div',{className:'fx-sub-foot'},h(Button,{variant:'primary',block:true,disabled:!ready,onClick:p.onConfirm,className:'fx-wp-cta'},cta)));}
function ModelStack(p){var m=p.model||{};
  return h('button',{className:'fx-mstack',title:'Choose your model','aria-label':'Choose your model',onClick:p.onClick},
    h('span',{className:'fx-mstack-back'},h(Icon,{name:'camera',size:15,stroke:1.3})),
    h('span',{className:'fx-mstack-front',style:{backgroundImage:m.src?'url('+m.src+')':'none',backgroundSize:m.bs||'450% auto',backgroundPosition:m.bp||'50% 9%'}}));}
function ModelPicker(p){var ms=p.models||[],sel=p.value||0;
  return h('div',{className:'fx-mp-wrap'},h('div',{className:'fx-mp-scrim',onClick:p.onClose}),
    h('div',{className:'fx-mp',role:'dialog','aria-label':'Your model'},
      h('div',{className:'fx-mp-head'},h('span',{className:'fx-adj-ttl'},p.title||'Your model'),h('button',{className:'fx-adj-x',title:'Close','aria-label':'Close',onClick:p.onClose},h(Icon,{name:'close',size:14,stroke:1.6}))),
      h('div',{className:'fx-mp-row'},
        h('button',{className:'fx-mp-own',title:'Use my likeness','aria-label':'Use my likeness',onClick:p.onOwn},h('span',{className:'fx-mp-own-disc'},h(Icon,{name:'camera',size:22,stroke:1.3}))),
        ms.map(function(m,i){var on=i===sel;return h('button',{key:i,className:'fx-mp-card',title:m.name,'aria-label':m.name,'aria-pressed':on,onClick:function(){p.onPick&&p.onPick(i);}},
          h('span',{className:cx('fx-mp-face',on&&'fx-mp-face-on'),style:{backgroundImage:'url('+m.src+')',backgroundSize:m.bs||'450% auto',backgroundPosition:m.bp||'50% 9%'}},
            h('span',{className:'fx-mp-tick',style:{opacity:on?1:0}},h(Icon,{name:'check',size:11,stroke:2.4}))));}))));}
function NotificationsSheet(p){var al=p.alerts||[];
  return h('div',{className:'fx-mp-wrap'},h('div',{className:'fx-mp-scrim',onClick:p.onClose}),
    h('div',{className:'fx-al',role:'dialog','aria-label':p.title||'Notifications'},
      h('div',{className:'fx-al-head'},
        h('button',{className:'fx-draft-close',title:'Cancel','aria-label':'Cancel',onClick:p.onClose},h(Icon,{name:'close',size:14,stroke:1.6})),
        h('span',{className:'fx-al-ttl'},p.title||'Notifications'),
        h('button',{className:'fx-draft-done',title:'Done','aria-label':'Done',onClick:p.onDone||p.onClose},h(Icon,{name:'check',size:15,stroke:2}))),
      al.length?h('div',{className:'fx-al-list'},al.map(function(a,i){return h('div',{key:i,className:'fx-al-row'},
          h('button',{className:'fx-al-card',onClick:a.onOpen},h('span',{className:'fx-al-ico'},h(Icon,{name:a.icon||'calendar',size:14,stroke:1.3})),
            h('span',{className:'fx-al-body'},h('span',{className:'fx-al-text'},a.text),h('span',{className:'fx-al-dest'},a.dest)),h('span',{className:'fx-al-go'},'›')),
          h('button',{className:'fx-al-x',title:'Dismiss','aria-label':'Dismiss '+a.text,onClick:a.onDismiss},'×'));}))
        :h('div',{className:'fx-al-empty'},p.emptyText||'Nothing new.')));}
var SET_ROWS={style:[{label:'Your digital twin'},{label:'Style DNA'},{label:'Observations'}],account:[{label:'Details'},{label:'Notifications'}]};
function SettingsView(p){var tab=p.tab||'style',rows=((p.rows&&p.rows[tab])||SET_ROWS[tab]).map(function(r){return typeof r==='string'?{label:r}:r;});
  return h('div',{className:'fx-sub fx-set',role:'dialog','aria-label':p.title||'Settings'},
    h('div',{className:'fx-sub-head'},h('button',{className:'fx-sub-back',title:'Back','aria-label':'Back',onClick:p.onBack},h(Icon,{name:'back',size:20,stroke:1.4})),
      h('span',{className:'fx-sub-ttl'},p.title||'Settings'),h('span',{className:'fx-sub-sp'})),
    h('div',{className:'fx-sub-body fx-set-body'},
      h(Tabs,{items:['Style profile','Account'],value:tab==='style'?'Style profile':'Account',onChange:function(v){p.onTab&&p.onTab(v==='Account'?'account':'style');}}),
      h('div',{className:'fx-set-panel'},
        h('div',{className:'fx-drill'},rows.map(function(r){return h(DrillRow,{key:r.label,label:r.label,value:r.value||'',muted:!!r.muted,onClick:function(){p.onRow&&p.onRow(r.label);}});})),
        tab==='account'&&p.onSignOut!==null?h('div',{className:'fx-set-out'},h(Button,{variant:'outline',block:true,onClick:p.onSignOut},'Sign out')):null)));}
function AlertDialog(p){var acts=p.actions||[];
  return h('div',{className:'fx-confirm-scrim',onClick:function(e){if(e.target===e.currentTarget&&p.onDismiss)p.onDismiss();}},
    h('div',{className:'fx-confirm',role:'alertdialog','aria-label':p.title},
      h('div',{className:'fx-confirm-t'},p.title),p.message?h('div',{className:'fx-confirm-s'},p.message):null,
      h('div',{className:'fx-confirm-acts'},acts.map(function(a,i){return a.variant==='text'?h('button',{key:i,className:'fx-confirm-text',onClick:a.onClick},a.label):h(Button,{key:i,variant:a.variant||(i?'outline':'primary'),block:true,onClick:a.onClick},a.label);}))));}
function LookDetails(p){var tags=p.tags||[],seas=(p.seasons||[]).filter(function(s){return SEASONS.indexOf(s)>=0;}),many=seas.length>2,cap=p.caption||'',ed=!!p.captionEditing;
  var st=React.useState(cap),cv=p.captionDraft!=null?p.captionDraft:st[0];
  return h('div',{className:'fx-drill'},
    h(DrillRow,{label:'Tags',value:tags.length?tags.join(', '):'None',muted:!tags.length,onClick:p.onTags}),
    h(DrillRow,{label:'Seasons',muted:!seas.length,onClick:p.onSeasons,value:seas.length?seas.map(function(s){return h('span',{key:s,className:'fx-season',title:s},h(Icon,{name:s.toLowerCase(),size:12,stroke:1.6}),many?null:h('span',null,s));}):'Year Round'}),
    h(DrillRow,{label:'Worn',value:p.worn||'Not worn yet',muted:true,onClick:p.onWorn}),
    ed?h('div',{className:'fx-cap-row fx-cap-editing'},h('span',{className:'fx-drill-k'},'Caption'),
        h('input',{className:'fx-cap-input',value:cv,placeholder:'Add a caption','aria-label':'Caption',autoFocus:p.autoFocus,
          onChange:function(e){st[1](e.target.value);p.onCaptionChange&&p.onCaptionChange(e.target.value);},
          onKeyDown:function(e){if(e.key==='Enter'&&p.onCaptionSave)p.onCaptionSave(cv);},onBlur:function(){p.onCaptionSave&&p.onCaptionSave(cv);}}),
        h('button',{className:'fx-cap-clear',title:'Clear','aria-label':'Clear caption',disabled:!cv,onPointerDown:function(e){e.preventDefault();st[1]('');p.onCaptionChange&&p.onCaptionChange('');}},h(Icon,{name:'close',size:12,stroke:1.6})))
      :h(DrillRow,{label:'Caption',value:cap,onClick:p.onCaption,trail:h('span',{className:'fx-drill-edit',title:'Edit caption'},h(Icon,{name:'edit',size:14,stroke:1.4}))}));}
function PieceRow(p){var empty=p.value==null||p.value===''||(Array.isArray(p.value)&&!p.value.length);
  var v=Array.isArray(p.value)?p.value.join(', '):p.value;
  return h('div',{className:cx('fx-pr',p.disabled&&'fx-pr-off')},
    h('button',{className:'fx-pr-row',onClick:p.disabled?undefined:p.onClick,disabled:!!p.disabled},
      h('span',{className:'fx-pr-k'},p.label),
      h('span',{className:cx('fx-pr-v',empty&&!p.note&&'fx-pr-add')},
        p.swatch?h('span',{className:'fx-pr-sw',style:{background:p.swatch,borderRadius:p.square?'4px':'50%'}}):null,
        p.seasons&&p.seasons.length?h('span',{className:'fx-pr-seas'},p.seasons.map(function(s){return h(Icon,{key:s,name:s.toLowerCase(),size:13,stroke:1.6,label:s});})):null,
        h('span',{className:'fx-pr-t'},p.note?(empty?'Add':''):(empty?(p.placeholder||'Add'):v))),
      p.disabled?null:p.edit?h('span',{className:'fx-pr-pen'},h(Icon,{name:'edit',size:14,stroke:1.4})):h(Icon,{name:'forward',size:14,stroke:1.6,className:'fx-pr-go'})),
    p.note&&!empty?h('div',{className:'fx-pr-note'},p.value):null);}
function WardrobePiece(p){var tab=p.tab||'Piece',pc=p.piece||{},co=p.colour||{},we=p.wearing||{},shop=!!p.shop,f=p.onField||function(){};
  var go=function(l){return function(){f(l);};};
  var seas=(we.seasons||[]).filter(function(s){return SEASONS.indexOf(s)>=0;});
  var rows={
    Piece:[
      h(PieceRow,{key:'n',label:'Name',value:p.name,edit:true,onClick:go('Name')}),
      h(PieceRow,{key:'c',label:'Category',value:pc.category,onClick:go('Category')}),
      shop?h(PieceRow,{key:'s',label:'Shop',value:pc.shop,onClick:go('Shop')}):h(PieceRow,{key:'b',label:'Brand',value:pc.brand,onClick:go('Brand')}),
      h(PieceRow,{key:'z',label:'Size',value:pc.size,onClick:go('Size')}),
      h(PieceRow,{key:'p',label:'Price',value:pc.price,edit:true,onClick:go('Price')}),
      h(PieceRow,{key:'o',label:'Notes',value:pc.notes,note:true,edit:true,onClick:go('Notes')})],
    Colour:[
      h(PieceRow,{key:'c',label:'Colour',value:co.colour&&co.colour.name,swatch:co.colour&&co.colour.hex,onClick:go('Colour')}),
      h(PieceRow,{key:'a',label:'Additional colours',value:co.additional,onClick:go('Additional colours')}),
      h(PieceRow,{key:'p',label:'Print',value:co.print&&co.print.name,swatch:co.print&&co.print.swatch,square:true,onClick:go('Print')}),
      h(PieceRow,{key:'m',label:'Material',value:co.material,onClick:go('Material')})],
    Wearing:[
      h(PieceRow,{key:'w',label:'Worn',value:we.worn||'New',disabled:!we.worn,onClick:go('Worn')}),
      h(PieceRow,{key:'l',label:'In looks',value:we.looks?String(we.looks):'None',disabled:!we.looks,onClick:go('In looks')}),
      h(PieceRow,{key:'s',label:'Seasons',value:seas.length>2?'':(seas.length?seas:'Year Round'),seasons:seas,onClick:go('Seasons')}),
      h(PieceRow,{key:'o',label:'Wear it for',value:we.occasions,onClick:go('Wear it for')})]};
  return h('div',{className:'fx-wpc'},
    h(TopNav,{title:p.name,onBack:p.onBack||function(){},noProfile:true}),
    h('div',{className:'fx-wpc-scroll'},
      h(SavedLook,{className:'fx-wpc-photo',image:p.image,images:p.images,count:p.count,alt:p.name,adjustLabel:'Adjust piece image',onBack:null,onAdjust:p.onAdjust||function(){},onImages:p.onImages||function(){}}),
      h('div',{className:'fx-wpc-body'},
        h('div',{className:'fx-wpc-tabs'},h(Tabs,{items:['Piece','Colour','Wearing'],value:tab,onChange:p.onTab})),
        h('div',{className:'fx-pr-card'},rows[tab]),
        shop?null:h('button',{className:'fx-wpc-del',onClick:p.onDelete},'Delete piece'))),
    shop?h('div',{className:'fx-wpc-foot'},h(Button,{block:true,onClick:p.onAddToWardrobe},'Add to wardrobe')):null);}
function FilterChip(p){var on=!!p.selected,dis=!!p.disabled;
  return h('button',{type:'button',className:cx('fx-fchip',on&&'fx-fchip-on',dis&&'fx-fchip-off',p.className),'aria-pressed':on,disabled:dis,title:p.title,onClick:dis?undefined:p.onClick},
    p.icon?h(Icon,{name:p.icon,size:13,stroke:1.5}):null,p.label,p.count!=null?h('span',{className:'fx-fchip-n'},String(p.count)):null);}
function CollectionBar(p){var segs=p.segments||[],f=p.filters||[];
  return h('div',{className:cx('fx-cbar',p.sticky&&'fx-cbar-sticky')},
    h('div',{className:'fx-cbar-segs',role:'tablist'},segs.map(function(s,i){var k=s.key||s.label,on=p.value===k;
        return h('button',{key:k,role:'tab','aria-selected':on?'true':'false',className:'fx-cseg',onClick:function(){p.onChange&&p.onChange(k);}},s.icon?h(Icon,{name:s.icon,size:14,stroke:1.5}):null,s.label);}),
      h('span',{style:{flex:1}}),
      p.onAdd?h('button',{className:'fx-cbar-add',title:p.addLabel||'Add','aria-label':p.addLabel||'Add',onClick:p.onAdd},h(Icon,{name:'plus',size:14,stroke:1.8})):null),
    f.length?h('div',{className:'fx-cbar-row'},f.map(function(c){var k=c.key||c.label;return h(FilterChip,{key:k,label:c.label,count:c.count,disabled:c.count===0&&p.filter!==k,selected:p.filter===k,onClick:function(){p.onFilter&&p.onFilter(k);}});})):null,
    p.search?h('div',{className:'fx-cbar-search'},
      h('label',{className:'fx-search'},h(Icon,{name:'search',size:13,stroke:1.6}),h('input',{placeholder:p.search.placeholder||'Search',value:p.search.value,onChange:function(e){p.search.onChange&&p.search.onChange(e.target.value);}})),
      h('div',{className:'fx-vtoggle',role:'group','aria-label':'View'},[['grid','Grid view'],['list','List view']].map(function(v){return h('button',{key:v[0],title:v[1],'aria-label':v[1],'aria-pressed':(p.view||'grid')===v[0],onClick:function(){p.onView&&p.onView(v[0]);}},h(Icon,{name:v[0],size:15,stroke:1.5}));}))):null);}
function LookCard(p){var sug=!!p.suggested;
  return h('div',{className:'fx-lcard',role:'button',tabIndex:0,onClick:p.onOpen,onKeyDown:function(e){if(e.key==='Enter'&&p.onOpen)p.onOpen();}},
    h('div',{className:'fx-lcard-ph'},p.image?h('img',{src:p.image,alt:''}):null,
      sug?h('button',{className:cx('fx-lcard-bk',p.saved&&'fx-lcard-bk-on'),title:p.saved?'Remove from saved':'Save look','aria-label':p.saved?'Remove from saved':'Save look','aria-pressed':!!p.saved,onClick:function(e){e.stopPropagation();p.onSave&&p.onSave();}},h(Icon,{name:'bookmark',size:22,stroke:1.6})):null),
    h('div',{className:'fx-lcard-name'},p.name),
    h('div',{className:'fx-lcard-meta'},
      p.worn!=null?h('span',{className:'fx-lcard-w',title:'Times worn'},h(Icon,{name:'worn',size:12,stroke:1.5}),String(p.worn)):null,
      p.worn!=null&&p.occasion?h('span',{className:'fx-lcard-sep'},' · '):null,
      p.isNew?h('span',{className:'fx-lcard-sep'},'New · '):null,
      h('span',{className:'fx-lcard-occ'},p.occasion),h('span',{style:{flex:1}}),
      p.wishlist?h(Icon,{name:'heart',size:12,stroke:1.5,className:'fx-lcard-src',label:'Includes wishlist pieces'}):null,
      (p.shop||p.store)?h(Icon,{name:'bag',size:12,stroke:1.5,className:'fx-lcard-src',label:'Includes shop pieces'}):null));}
function PieceTile(p){
  return h('div',{className:'fx-ptile',role:'button',tabIndex:0,onClick:p.onOpen,onKeyDown:function(e){if(e.key==='Enter'&&p.onOpen)p.onOpen();}},
    h('div',{className:'fx-ptile-ph'},p.image?h('img',{src:p.image,alt:''}):null,
      p.onWish?h('button',{className:cx('fx-ptile-heart',p.wished&&'fx-ptile-heart-on'),title:p.wished?'Remove from wishlist':'Add to wishlist','aria-pressed':!!p.wished,onClick:function(e){e.stopPropagation();p.onWish();}},h(Icon,{name:'heart',size:25,stroke:1.5})):null),
    h('div',{className:'fx-ptile-name'},p.name),
    h('div',{className:'fx-ptile-meta'},p.worn!=null?h('span',{className:'fx-lcard-w',title:'Times worn'},h(Icon,{name:'worn',size:12,stroke:1.5}),String(p.worn)):h('span',null,p.meta)));}
function EmptyState(p){
  return h('div',{className:'fx-empty'},h('span',{className:'fx-empty-disc'},h(Icon,{name:p.icon||'bookmark',size:24,stroke:1.3})),
    h('div',{className:'fx-empty-t'},p.title),p.message?h('div',{className:'fx-empty-m'},p.message):null,
    p.action?h('button',{className:'fx-empty-cta',onClick:p.onAction},h(Icon,{name:'plus',size:12,stroke:1.8}),p.action):null);}
function PageDots(p){var n=p.count||0,c=p.value||0;
  return h('div',{className:'fx-dots',role:'tablist','aria-label':p.label||'Looks'},Array.from({length:n},function(_,i){return h('span',{key:i,className:'fx-dot','aria-current':i===c?'true':undefined});}));}
window.Felix=window.Felix=Object.assign(window.Felix||{},{Icon:Icon,Wordmark:Wordmark,TopNav:TopNav,Dock:Dock,WeekStrip:WeekStrip,ActionDisc:ActionDisc,Button:Button,Tabs:Tabs,PieceList:PieceList,Sheet:Sheet,SavedLook:SavedLook,DraftLook:DraftLook,ImageManager:ImageManager,AdjustSheet:AdjustSheet,TagsView:TagsView,SeasonsView:SeasonsView,WornView:WornView,DescribeSheet:DescribeSheet,WardrobePicker:WardrobePicker,ModelPicker:ModelPicker,ModelStack:ModelStack,NotificationsSheet:NotificationsSheet,SettingsView:SettingsView,AlertDialog:AlertDialog,LookDetails:LookDetails,WardrobePiece:WardrobePiece,FilterChip:FilterChip,CollectionBar:CollectionBar,LookCard:LookCard,PieceTile:PieceTile,EmptyState:EmptyState,PageDots:PageDots,GLYPHS:GLYPHS});
})();
