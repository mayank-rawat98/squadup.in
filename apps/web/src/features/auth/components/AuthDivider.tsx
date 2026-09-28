/* The "or" between the social button and the email form. */
export default function AuthDivider() {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-caption">or</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
