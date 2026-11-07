// A parallel slot keeps its last page across a soft navigation unless a route in the slot
// matches the new address (Next's intercepting-routes guidance): this catch-all is that match,
// so moving anywhere else — the saved look after Save, Home after Discard, the Lookbook after
// Delete — closes the drawer. default.tsx covers a hard load.
export default function DrawerClosed() {
  return null;
}
