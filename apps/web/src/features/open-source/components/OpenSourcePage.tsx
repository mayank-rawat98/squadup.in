import { ShieldCheck } from 'lucide-react';
import {
  Card,
  Container,
  Section,
  Typography,
  buttonVariants,
} from '@squadup.in/ui';
import { GithubIcon } from '@/components/atoms/BrandIcons';
import { REPOSITORY_LINKS } from '@/config/repository';
import {
  CONTRIBUTION_STEPS,
  OPEN_SOURCE_INTRO,
  OPEN_SOURCE_RESOURCES,
  WAYS_TO_HELP,
} from '../constants/open-source.constant';
import ExternalLink from './ExternalLink';

/*
 * /open-source. A server component: nothing here is interactive, and every
 * detail beyond the summary lives in the repository, which this links to.
 *
 * The one bold element is the pair of calls to action up top; the rest stays
 * quiet so the page reads as documentation, not marketing.
 */
export default function OpenSourcePage() {
  return (
    <>
      <Section spacing="none" className="pt-28 pb-12 md:pt-36 md:pb-16">
        <Container width="prose" className="flex flex-col items-start gap-6">
          <Typography as="h1" variant="displayMd">
            {OPEN_SOURCE_INTRO.title}
          </Typography>
          <Typography variant="subtitle2" className="text-muted-foreground">
            {OPEN_SOURCE_INTRO.description}
          </Typography>
          <div className="flex flex-wrap gap-3">
            <a
              href={REPOSITORY_LINKS.repository}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({ size: 'lg' })}
            >
              <GithubIcon className="h-4 w-4" />
              View the code on GitHub
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a
              href={REPOSITORY_LINKS.contributing}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({ size: 'lg', variant: 'outline' })}
            >
              Read the contributing guide
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </Container>
      </Section>

      <Section tone="muted" spacing="md" aria-labelledby="ways-to-help">
        <Container className="flex flex-col gap-8">
          <Typography as="h2" variant="h3" id="ways-to-help">
            Ways to help
          </Typography>
          <ul className="grid gap-4 sm:grid-cols-2">
            {WAYS_TO_HELP.map(({ icon: Icon, title, description, link }) => (
              <Card as="li" key={title} className="flex flex-col gap-3">
                <span className="bg-accent text-accent-foreground flex h-10 w-10 items-center justify-center rounded-lg">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <Typography as="h3" variant="h6">
                  {title}
                </Typography>
                <Typography
                  variant="bodySmall"
                  className="text-muted-foreground flex-1"
                >
                  {description}
                </Typography>
                <ExternalLink href={link.href} className="text-body-sm">
                  {link.label}
                </ExternalLink>
              </Card>
            ))}
          </ul>
        </Container>
      </Section>

      <Section spacing="md" aria-labelledby="how-it-works">
        <Container className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-8">
            <Typography as="h2" variant="h3" id="how-it-works">
              How a contribution works
            </Typography>
            <ol className="flex flex-col gap-6">
              {CONTRIBUTION_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="border-border text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-body-sm font-semibold"
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <Typography as="h3" variant="h6">
                      {step.title}
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      className="text-muted-foreground"
                    >
                      {step.description}
                    </Typography>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="flex flex-col gap-6">
            <Card padding="md" className="flex flex-col gap-4">
              <Typography as="h2" variant="h6">
                Start here
              </Typography>
              <ul className="flex flex-col gap-3">
                {OPEN_SOURCE_RESOURCES.map((resource) => (
                  <li key={resource.label}>
                    <ExternalLink href={resource.href} className="text-body-sm">
                      {resource.label}
                    </ExternalLink>
                  </li>
                ))}
              </ul>
            </Card>

            <Card padding="md" className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  aria-hidden="true"
                  className="text-primary h-5 w-5"
                />
                <Typography as="h2" variant="h6">
                  Found a vulnerability?
                </Typography>
              </div>
              <Typography variant="bodySmall" className="text-muted-foreground">
                Please don&apos;t open a public issue. Report it privately, as
                the security policy explains, so it can be fixed before anyone
                can use it.
              </Typography>
              <ExternalLink
                href={REPOSITORY_LINKS.security}
                className="text-body-sm"
              >
                Read the security policy
              </ExternalLink>
            </Card>
          </aside>
        </Container>
      </Section>
    </>
  );
}
