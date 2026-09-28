import Link from 'next/link';
import { Container, Typography } from '@squadup.in/ui';
import Logo from '@/components/atoms/Logo';
import { GithubIcon, SOCIAL_ICONS } from '@/components/atoms/BrandIcons';
import { FOOTER_COLUMNS, SOCIAL_LINKS } from '@/config/navigation';
import { OPEN_SOURCE_PATH, REPOSITORY_LINKS } from '@/config/repository';

/*
 * Five columns on desktop, stacked on mobile.
 *
 * No newsletter block. The brief says to add one only if updates will actually
 * be sent, and a form with no endpoint behind it is worse than no form. Drop
 * it in here once /forms/newsletter exists.
 *
 * An open-source strip sits above the copyright line: the code is public
 * under MIT, and a developer reading the footer is exactly who might help.
 *
 * Links flagged `comingSoon` render as plain text. They stay visible so the
 * shape of the product is legible, but nothing navigates to a route that is
 * not built yet.
 */

function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border bg-secondary/40 border-t">
      <Container>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-14 md:grid-cols-3 lg:grid-cols-6 lg:py-16">
          {/* Brand column is wider than the link columns. */}
          <div className="col-span-2 flex flex-col gap-4">
            <Logo />
            <Typography
              variant="bodySmall"
              className="text-muted-foreground max-w-xs"
            >
              Build real software. Compete with your squad. Grow as a developer.
            </Typography>

            <ul className="flex items-center gap-1 pt-1">
              {SOCIAL_LINKS.map((social) => {
                const Icon = SOCIAL_ICONS[social.label];
                const external = social.href.startsWith('http');

                return (
                  <li key={social.label}>
                    <Link
                      href={social.href}
                      aria-label={social.label}
                      {...(external
                        ? { target: '_blank', rel: 'noreferrer noopener' }
                        : {})}
                      className="text-muted-foreground hover:text-primary hover:bg-accent focus-visible:ring-ring inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <Typography as="h2" variant="caption" weight="semibold">
                {column.title}
              </Typography>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {/*
                     * The unavailable label is plain inline, not a flex row —
                     * a two-word label like "College Chapters" wraps, and flex
                     * would strand the badge on its own line rather than
                     * letting it follow the text.
                     */}
                    {link.comingSoon ? (
                      <span className="text-muted-foreground/60 text-body-sm">
                        {link.label}{' '}
                        <span className="border-border text-muted-foreground/70 ml-0.5 rounded border px-1 align-middle text-micro whitespace-nowrap uppercase">
                          Soon
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-primary focus-visible:ring-ring rounded-sm text-body-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-border flex flex-col gap-4 border-t py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <GithubIcon className="text-foreground mt-0.5 h-5 w-5 shrink-0 sm:mt-0" />
            <Typography variant="bodySmall" className="text-muted-foreground">
              <span className="text-foreground font-medium">
                SquadUp is open source.
              </span>{' '}
              The code is on GitHub under the MIT licence, and contributions are
              welcome.
            </Typography>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href={REPOSITORY_LINKS.repository}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary focus-visible:ring-ring rounded-sm text-body-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Star on GitHub
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <Link
              href={OPEN_SOURCE_PATH}
              className="text-primary focus-visible:ring-ring rounded-sm text-body-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              How to contribute
            </Link>
          </div>
        </div>

        <div className="border-border flex flex-col items-center justify-between gap-4 border-t py-6 sm:flex-row">
          <Typography variant="caption" className="text-muted-foreground">
            © {year} SquadUp. Built for developers who love building.
          </Typography>
          <Typography variant="caption" className="text-muted-foreground">
            Made in India 🇮🇳
          </Typography>
        </div>
      </Container>
    </footer>
  );
}

SiteFooter.displayName = 'SiteFooter';

export default SiteFooter;
