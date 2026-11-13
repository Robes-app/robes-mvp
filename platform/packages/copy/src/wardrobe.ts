import { SEASON_LABELS } from './seasons';
import { countWord } from './words';

export const wardrobe = {
  title: 'Your wardrobe',
  newPiece: 'New piece',
  reading: 'Robes is reading this piece…',
  noPieceFound: 'Robes couldn’t see a piece in this photo.',
  // The empty wardrobe (Front Door PRD rev 3 §7.2): a hanger on a white disc, one line, one door.
  empty: {
    title: 'Your wardrobe is empty',
    body: 'Add pieces from a photo, a product link or a receipt. Robes fills in the details for you to review.',
    action: 'Add pieces',
  },
  deleted: 'Piece removed.',
  undo: 'Undo',
  // The header's tabs (Front Door PRD rev 3 §7.1): Owned · Wishlist · Shop (not open yet). The
  // list under Owned is still "Pieces"; Inbox names the receipts.
  segments: {
    pieces: 'Pieces',
    wardrobe: 'Wardrobe',
    owned: 'Owned',
    wishlist: 'Wishlist',
    shop: 'Shop',
    inbox: 'Inbox',
  },
  removePiece: (label: string): string => `Remove ${label}`,
  deletePiece: (label: string): string => `Delete ${label}`,
  photoAlt: (label: string): string => `Photo of ${label}`,
  wishlistEmpty: {
    title: 'Pieces you’re after live here.',
    body: 'Keep a list of what you want, then tell Robes when you buy it.',
  },
  piece: {
    back: 'Wardrobe',
    label: 'Name',
    brand: 'Brand',
    color: 'Colour',
    size: 'Size',
    notes: 'Notes',
    save: 'Save changes',
    saving: 'Saving…',
    saved: 'Saved.',
    remove: 'Remove from wardrobe',
    stylePiece: 'Style this piece',
    // The record door leads with the photograph (legacy bc56305): the name carries a pencil
    // and the brand is its own tappable line, empty or not.
    addBrand: 'Add the brand',
    // Robes named the house from the design, not a label it could read.
    brandCheck: 'Robes named this brand from the design. Check it.',
    // The pill on the record's photograph (legacy rb-pc-rephoto); with no photo, it adds one.
    changePhoto: 'Change photo',
    addPhoto: 'Add a photo',
    // The record's sections (legacy Piece_Sheet 01): every fact is a row, a tap opens its drawer.
    sections: {
      piece: 'The piece',
      // Colour and material share one section (design "Colour & material, one section").
      colour: 'Colour & material',
      wearing: 'Wearing',
      fit: 'Fit & notes',
      wears: 'Wears',
      looks: (n: number): string => (n === 1 ? 'In one look' : `In ${n} looks`),
      noLooks: 'Not in a look yet',
      noLooksHint: 'Build a look and it files here.',
    },
    // The Category drill (wardrobe_taxonomy). The sheet calls its third level "item type"; she
    // reads "type", because nothing in Robes is an item.
    taxonomy: {
      justThis: (l2: string): string => `Just ${l2.toLowerCase()}`,
    },
    rows: {
      category: 'Category',
      colour: 'Colour',
      extra: 'Additional colours',
      print: 'Print',
      material: 'Material',
      // The four seasons (D12); none filed reads Year round.
      season: 'Seasons',
      wearFor: 'Wear it for',
      size: 'Size',
      price: 'Price',
      notes: 'Notes',
      // A wish's retailer, where an owned piece reads Brand (Front Door PRD rev 3 §7.3).
      shop: 'Shop',
      // The Wearing tab's record rows (§7.3): "8 times · last 27 Oct", "3".
      worn: 'Worn',
      inLooks: 'In looks',
    },
    // The page's tabs (PRD rev 3 §7.3): PIECE · COLOUR · WEARING.
    tabs: { piece: 'Piece', colour: 'Colour', wearing: 'Wearing' },
    // Delete piece (PRD §7.3, plan R14): an outline button, asked first; Undo still follows.
    delete: 'Delete piece',
    deleteTitle: 'Delete this piece?',
    deleteBody: 'It will be removed from your wardrobe and from any looks it’s in.',
    deleteWishBody: 'It will be removed from your wishlist.',
    deleteConfirm: 'Delete',
    cancel: 'Cancel',
    // A wish's page (§7.3): the same anatomy, Bought and Delete piece at the foot.
    openShop: 'Open the shop page',
    // What a row says when there is nothing filed yet — a door, not a blank.
    add: 'Add',
    // A row that is a fact with nothing to say yet (a wish's Wear it for, In looks).
    none: '—',
    // Robes' read on this row is a guess she should look at (until she touches it).
    check: 'Check',
    saveField: 'Save',
    done: 'Done',
    // The stats strip under the name.
    stats: { worn: 'Worn', lastWorn: 'Last worn', inLooks: 'In looks', never: 'Not yet' },
    wears: {
      none: 'Not yet. The counter starts the first day you wear it.',
      openDay: (date: string): string => `Open ${date}`,
      undated: (n: number): string =>
        n === 1
          ? 'One wear counted before Robes kept the dates.'
          : `${n} wears counted before Robes kept the dates.`,
    },
    extraHint: 'Buttons, trims, a second colour in the weave. Tap as many as there are.',
  },
  // The colour model on a piece (legacy f3e5b5b): one shade, up to three more, a print.
  colour: {
    title: 'Colour',
    notSet: 'Not set',
    change: 'Change colour',
    done: 'Done',
    main: 'Main colour',
    extra: 'Additional colours',
    extraHint: 'Up to three.',
    families: 'Colour families',
    print: 'Print',
    plain: 'Plain',
    check: 'Robes wasn’t sure of this colour. Check it.',
  },
  // The material model on a piece (legacy 2026-10-24): one material, the one it is mostly made of.
  // The family and material names live with the list in @robes/core/material.
  material: {
    title: 'Material',
    families: 'Material families',
    notSure: 'Not sure',
    check: 'Robes wasn’t sure of this material. Check it.',
  },
  // The piece record's rows and their one-field drawers (redline audit "Add a piece", 26 Oct).
  fields: {
    // What an empty row offers, in the faint ink, instead of a column of "Add".
    // A filled Notes row: the note prints beneath, the row is the door to change it.
    edit: 'Edit',
    name: { placeholder: 'What is it?' },
    brand: { placeholder: 'Who made it' },
    notes: { placeholder: 'How it fits, how you wear it' },
    // The category drill's back chevron.
    back: (to: string): string => `Back to ${to}`,
    price: {
      helper: 'Both optional. Robes fills them in when a receipt or a link carries them.',
      currencies: 'Currency',
      chip: (symbol: string, code: string): string => `${symbol} ${code}`,
    },
    size: {
      down: 'A size smaller',
      up: 'A size larger',
      conversion: (eu: number, us: number): string => `EU ${eu} · US ${us}`,
      notSure: 'Not sure',
    },
    wearFor: {
      helper: 'Pick as many as fit.',
      own: '+ Your own',
      ownLabel: 'Your own',
    },
  },
  // The reveal after one photo (beta's step 3): her photo, then what Robes filed.

  wishlist: {
    bought: 'I bought this',
    boughtToast: (label: string): string => `${label} is in your wardrobe now.`,
    removed: 'Removed from your wishlist.',
    remove: (label: string): string => `Remove ${label}`,
    // The filled heart on a wish's photograph (PRD rev 3 §7.2) lets it go.
    unwish: (label: string): string => `Remove ${label} from your wishlist`,
  },
  // The one header (legacy a268ef0/809b13e): track + circle, category tabs, the 32pt count row.
  header: {
    addPiece: 'Add a piece',
    savePiece: 'Save a piece',
    categories: 'Categories',
    all: 'All',
    count: (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`),
    wishCount: (n: number): string => `${n} wishlisted`,
    filter: 'Filter',
    layout: 'Layout',
    grid: 'Grid',
    list: 'List',
  },
  // The piece card and row (legacy b4b051a; Front Door canvas 3b).
  card: {
    worn: (n: number): string => `Worn ${n}×`,
    neverWorn: 'Never worn',
    // A row's meta before the first wear (PRD rev 3 §7.2).
    new: 'New',
    notYours: (price: string | null): string =>
      price ? `${price} · Not yours yet` : 'Not yours yet',
    star: (label: string): string => `Feature ${label} in your Hero Rack`,
    unstar: (label: string): string => `Remove ${label} from your Hero Rack`,
    starred: 'Saved to your Hero Rack.',
    unstarred: 'Removed from your Hero Rack.',
    heroFull: 'The Hero Rack holds ten. Remove one first.',
    swipeRemove: 'Remove',
    swipeDelete: 'Delete',
    noPhoto: 'Photograph it',
  },
  filter: {
    title: 'Filter',
    season: 'Season',
    colour: 'Colour',
    seasons: SEASON_LABELS,
    wearFor: 'Wear it for',
    brand: 'Brand',
    allBrands: 'All brands',
    show: (n: number): string => (n === 1 ? 'Show 1 piece' : `Show ${n} pieces`),
    clear: 'Clear all',
    // The brand select, open: the list to pick from.
    brands: 'Brands',
    nothing: 'Nothing in your wardrobe here.',
    wishNothing: 'Nothing on your wishlist here.',
    showEverything: 'Show everything',
  },
  edit: 'Edit',
  addFailed: 'Robes couldn’t add those photos. Try again in a moment.',
  cameraDenied: 'Allow Robes to use the camera in Settings to photograph pieces.',
  category: 'Category',
  // Wardrobe › Inbox: one forwarded receipt at a time, every piece ticked until she unticks what
  // went back (Add Piece redline 05c). The notice is the card on Wardrobe while one waits (05b).
  inbox: {
    from: (retailer: string): string => `From ${retailer}`,
    today: 'Today',
    yesterday: 'Yesterday',
    read: (n: number): string => `${n} ${n === 1 ? 'piece' : 'pieces'} read`,
    untick: 'Untick anything that went back.',
    file: (n: number): string =>
      n === 0 ? 'File pieces' : `File ${n} ${n === 1 ? 'piece' : 'pieces'}`,
    toWishlist: 'Add to wishlist',
    skip: 'Skip',
    more: (n: number): string =>
      n === 1 ? 'One more receipt after this.' : `${countWord(n)} more receipts after this.`,
    filed: 'Filed.',
    skipped: 'Skipped.',
  },

  // Add a piece, end to end (design "Add Piece — Handoff", 2026-10-26): one sheet, every way in,
  // one Review before anything files. Where the pieces go is chosen once and carried through.
  // The Add pieces sheet (Front Door PRD rev 3 §4.6, §7.4): three tiles over the screen; Paste
  // URL turns it into Add from Link with the field inline. Over the draft it reads Add your pieces.
  addSheet: {
    title: 'Add pieces',
    draftTitle: 'Add your pieces',
    pasteUrl: 'Paste URL',
    photo: 'Photo',
    fromReceipt: 'From receipt',
    linkTitle: 'Add from Link',
    linkField: 'Paste a link',
    linkGo: 'Read the page',
    manual: 'Add without a photo',
  },
  // Receipts (PRD rev 3 §7.5): the Inbox as tabs, her forwarding address, the pieces by retailer.
  receipts: {
    title: 'Receipts',
    tabs: { inbox: 'Inbox', added: 'Added', discarded: 'Discarded' },
    forwardTo: 'Forward receipts to',
    extracted: 'Pieces will be extracted for your review.',
    group: (retailer: string, n: number): string => `${retailer} (${n})`,
    size: (size: string): string => `Size ${size}`,
    unknownRetailer: 'A receipt',
    add: (label: string): string => `Add ${label} to your wardrobe`,
    discard: (label: string): string => `Discard ${label}`,
    addAll: 'Add every piece',
    discardAll: 'Discard every piece',
    order: (ref: string): string => `Order ${ref}`,
    sender: (email: string): string => `From ${email}`,
    received: (day: string): string => `Received ${day}`,
    decided: (day: string): string => `Decided ${day}`,
    addedEmpty: 'Nothing added from a receipt yet.',
    discardedEmpty: 'Nothing discarded.',
    added: 'Added to your wardrobe.',
    discarded: 'Discarded.',
  },
  add: {
    title: 'Add pieces',
    close: 'Close',
    destination: 'Where they go',
    to: { wardrobe: 'Wardrobe', wishlist: 'Wishlist' },
    doors: {
      photograph: 'Take a photo',
      cameraRoll: 'Camera roll',
      link: 'Paste a link',
      receipt: 'Forward a receipt',
      manual: 'Add without a photo',
    },
    link: {
      eyebrow: 'Paste a link',
      title: 'Add from a',
      wink: 'shop page.',
      label: 'Link to the piece',
      placeholder: 'https://',
      paste: 'Paste',
      clear: 'Clear the link',
      // Where the piece goes, chosen once on the Add pieces sheet; Change goes back to it.
      filingTo: {
        wardrobe: 'Filing to your wardrobe',
        wishlist: 'Filing to your wishlist',
      },
      change: 'Change',
      read: 'Read the page',
      reading: 'Reading the page…',
      failed: 'Robes couldn’t read that page.',
      fixIt: 'Fix it',
    },
    manual: {
      eyebrow: 'Without a photo',
      title: 'Add a',
      wink: 'piece.',
      addPhoto: 'Add a photo later',
      changePhoto: 'Change the photo',
      uploading: 'Adding the photo…',
      failed: 'Robes couldn’t add that piece. Try again in a moment.',
    },
    // What Review still says from before the list (Capture PRD 3c): a row while Robes reads,
    // and the photo that could not be read.
    review: {
      reading: 'Reading…',
      unread: 'Robes couldn’t read this one.',
      fillIn: 'Fill it in yourself',
      nothing: 'Robes couldn’t see a piece in those photos.',
      stalled: 'One photo didn’t upload. Take it again.',
      failed: 'Robes couldn’t file that. Try again in a moment.',
    },
    filed: {
      head: (n: number): string => `${countWord(n)} ${n === 1 ? 'piece' : 'pieces'}`,
      wink: 'filed.',
      line: {
        wardrobe: 'In your wardrobe, ready to style.',
        wishlist: (n: number): string =>
          n === 1 ? 'It’s on your wishlist.' : 'They’re on your wishlist.',
      },
      none: 'Nothing filed this time.',
      see: { wardrobe: 'See your wardrobe', wishlist: 'See your wishlist' },
      another: 'Add another',
    },
    file: (to: 'wardrobe' | 'wishlist'): string =>
      to === 'wishlist' ? 'Add to wishlist →' : 'Add to wardrobe →',
  },
  // Wardrobe › Photo (Capture PRD 3c, 10 Nov 2026; canvas frame 3c): several photographs in one
  // sitting, reviewed together, added at once. Every string is the PRD's.
  capture: {
    camera: {
      hint: 'One piece per photo · Lay it flat or hang it up',
      next: 'Next piece, or review when you’re done',
      ready: (n: number): string => (n === 1 ? '1 piece ready' : `${n} pieces ready`),
      review: (n: number): string => `Review ${n}`,
      close: 'Close',
      photos: 'Choose from your photos',
      shutter: 'Take photo',
      denied: 'Allow the camera in your settings to take a photo here.',
      // The sitting's limit (twelve photographs; each is read on its own).
      full: 'That’s twelve. Review these, then carry on.',
    },
    review: {
      title: 'Review',
      one: 'Review piece',
      of: (n: number, of: number): string => `Piece ${n} of ${of}`,
      head: (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`),
      sub: 'Tap a piece to check its details. Remove anything that shouldn’t be here.',
      reading: 'Reading the details…',
      details: 'Add the details',
      another: '+ Add another piece',
      back: 'Back',
      open: (label: string): string => `Check ${label}`,
      remove: (label: string): string => `Remove ${label}`,
      removePiece: 'Remove this piece',
      done: 'Done',
      piece: 'Piece',
      colour: 'Colour',
      footnote: 'Seasons and what you wear it for live on the piece’s Wearing tab.',
      add: (n: number, to: 'wardrobe' | 'wishlist'): string => {
        const where = to === 'wishlist' ? 'wishlist' : 'wardrobe';
        return n === 1 ? `Add to ${where}` : `Add ${n} to ${where}`;
      },
      adding: 'Adding…',
    },
    added: (n: number, to: 'wardrobe' | 'wishlist'): string => {
      const where = to === 'wishlist' ? 'wishlist' : 'wardrobe';
      return n === 1 ? `1 piece added to your ${where}` : `${n} pieces added to your ${where}`;
    },
  },
  // The camera in the app (design "Add Piece — Handoff"): every shot is read as it is taken, and
  // Review opens on them, filing where the Add pieces sheet chose.
  camera: {
    title: 'Camera',
    close: 'Close the camera',
    shutter: 'Take the photo',
    taken: (n: number): string => (n === 1 ? '1 photo taken' : `${n} photos taken`),
    unreachable: 'Robes can’t reach the camera.',
    // The viewfinder before the camera answers, and the door when she refused it.
    waiting: 'The camera is opening.',
    allow: 'Allow the camera',
    useDevice: 'Use the phone’s camera',
    leave: (n: number): string => (n === 1 ? 'Leave this photo?' : `Leave these ${n} photos?`),
    leaveBody: 'Nothing is filed until you review them.',
    leaveConfirm: 'Leave them',
    stay: 'Keep shooting',
  },
} as const;
