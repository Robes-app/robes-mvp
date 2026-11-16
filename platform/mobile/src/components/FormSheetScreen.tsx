// The draft look's sheet (Felix DraftLook, D14): pulls up from the bottom edge at full height, 24pt
// under the top edge, so it stands over whatever started it. One height only, so no grabber; the
// draft paints its own cream ground. Twin of the web Drawer. (Add pieces is the glass sheet over
// the Wardrobe, never a route sheet: addPiecesHref.)
export const DRAFT_SHEET: {
  presentation: 'formSheet';
  sheetGrabberVisible: boolean;
  sheetAllowedDetents: number[];
  sheetCornerRadius: number;
} = {
  presentation: 'formSheet',
  sheetGrabberVisible: false,
  sheetAllowedDetents: [1],
  // Felix's sheet radius (rad-lg), as Robes MVP draws its sheets.
  sheetCornerRadius: 18,
};

// A form sheet's own frame must never be flattened away. react-native-screens looks for a ScrollView
// among the sheet's top views and, finding it third (after a head), stretches it over the whole
// sheet: over the head and under the foot, so the draft's prompt box sat under Style it and would
// not scroll (Annie, Felix, 12 Nov). Every view between the sheet and its ScrollView carries
// `collapsable={false}`, so the ScrollView keeps the frame our layout gives it.
