const DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** "Saved 4 Oct, 3:05 pm", for the list of sandboxes. */
export function savedLabel(iso: string): string {
  return `Saved ${DATE_TIME.format(new Date(iso))}`;
}
