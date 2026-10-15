import { redirect } from 'next/navigation';

// Ideas folded into the Lookbook's Suggested tab (legacy 2026-10-05/06).
export default function IdeasPage() {
  redirect('/looks?tab=suggested');
}
