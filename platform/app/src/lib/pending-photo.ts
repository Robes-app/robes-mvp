// A photo she picked on one screen that the next one reads (Capture Look, design 3k): the file
// picker opens on her tap in the log sheet, and the look-from-photo page starts its read from here
// on mount. Memory only; a reload simply shows that page's own camera door.
let pending: File | null = null;

export function setPendingPhoto(file: File): void {
  pending = file;
}

export function takePendingPhoto(): File | null {
  const file = pending;
  pending = null;
  return file;
}
