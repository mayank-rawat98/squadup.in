'use client';

import Link from 'next/link';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { ChevronRight, RotateCw } from 'lucide-react';
import { Alert, Button, EmptyState, Spinner, Typography } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { listEmailTemplates } from '../api/email-templates.api';
import {
  AUDIENCE_HEADINGS,
  EMAIL_AUDIENCES,
  EMAIL_TEMPLATE_QUERY_KEYS,
  emailTemplatePath,
} from '../constants/email-templates.constant';
import type { EmailTemplate } from '../types/email-template.types';
import EmailTemplateStatusBadge from './EmailTemplateStatusBadge';

/*
 * Every email the app sends, grouped by who receives it, with whether each
 * one has a mailtr template. The list comes from the API's catalogue, not
 * from what has been configured, so an email with no template still shows
 * up here: that is the gap this screen exists to close.
 */
export default function EmailTemplatesScreen() {
  const templates = useQuery({
    queryKey: EMAIL_TEMPLATE_QUERY_KEYS.all,
    queryFn: ({ signal }) => listEmailTemplates(signal),
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Typography as="h1" variant="h2">
          Email templates
        </Typography>
        <Typography className="text-muted-foreground max-w-2xl">
          Which mailtr template each email uses. An email with no template
          isn&apos;t sent, so set one before the feature that sends it goes
          live.
        </Typography>
      </header>

      <TemplatesBody query={templates} />
    </div>
  );
}

function TemplatesBody({ query }: { query: UseQueryResult<EmailTemplate[]> }) {
  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading email templates" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        title="We couldn't load the email templates"
        description={getErrorMessage(query.error)}
        action={
          <Button onClick={() => query.refetch()}>
            <RotateCw aria-hidden="true" className="h-4 w-4" />
            Try again
          </Button>
        }
      />
    );
  }

  const templates = query.data;
  if (templates.length === 0) {
    return (
      <EmptyState
        title="No emails to configure"
        description="The API listed no emails. EMAIL_TEMPLATE_CATALOGUE in the API's mailer constants should never be empty, so check the API version."
      />
    );
  }

  const unsent = templates.filter((t) => t.status !== 'configured').length;

  return (
    <>
      <Typography variant="bodySmall" className="text-muted-foreground">
        {templates.length - unsent} of {templates.length} emails have a template
        and are switched on.
      </Typography>
      {unsent > 0 ? (
        <Alert tone="warning">
          {unsent === 1
            ? '1 email is not being sent: it has no template, or it is switched off.'
            : `${unsent} emails are not being sent: they have no template, or they are switched off.`}
        </Alert>
      ) : null}

      {EMAIL_AUDIENCES.map((audience) => {
        const group = templates.filter((t) => t.audience === audience);
        if (group.length === 0) return null;
        const headingId = `audience-${audience}`;
        return (
          <section
            key={audience}
            aria-labelledby={headingId}
            className="flex flex-col gap-3"
          >
            <Typography as="h2" variant="h5" id={headingId}>
              {AUDIENCE_HEADINGS[audience]}
            </Typography>
            <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
              {group.map((template) => (
                <li key={`${template.audience}:${template.emailType}`}>
                  <TemplateRow template={template} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function TemplateRow({ template }: { template: EmailTemplate }) {
  return (
    <Link
      href={emailTemplatePath(template.audience, template.emailType)}
      className="hover:bg-accent/50 focus-visible:ring-ring flex items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-sm text-foreground font-medium">
          {template.label}
        </span>
        <span className="text-caption text-muted-foreground truncate font-mono">
          {template.templateId ?? 'No template'}
        </span>
      </span>
      <EmailTemplateStatusBadge status={template.status} />
      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground h-4 w-4 shrink-0"
      />
    </Link>
  );
}
