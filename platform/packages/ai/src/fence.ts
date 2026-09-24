// User text goes only in the user turn, fenced and truncated so it can't pose as instructions
// (SEC-23). Tag look-alikes are stripped so the fence can't be closed from inside.
function isControl(char: string): boolean {
  const code = char.charCodeAt(0);
  return code < 32 && char !== '\n' && char !== '\t' && char !== '\r';
}

export function fenceUserText(text: string, maxChars: number): string {
  const cleaned = [...text.replace(/<\/?\s*user_input[^>]*>/gi, '')]
    .filter((char) => !isControl(char))
    .join('')
    .trim()
    .slice(0, maxChars);
  return `<user_input>\n${cleaned}\n</user_input>`;
}
