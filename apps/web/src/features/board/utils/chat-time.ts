const TIME = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const DAY_AND_TIME = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "10:41" for today, "3 Oct, 10:41" for anything older. */
export function chatTime(sentAt: Date, now: Date = new Date()): string {
  return (sameDay(sentAt, now) ? TIME : DAY_AND_TIME).format(sentAt);
}
