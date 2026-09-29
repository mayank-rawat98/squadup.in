'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RotateCw, Send } from 'lucide-react';
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Spinner,
  Typography,
  toast,
} from '@squadup.in/ui';
import { getErrorMessage, isApiError } from '@/lib/api';
import {
  getEmailTemplate,
  sendTestEmail,
  updateEmailTemplate,
} from '../api/email-templates.api';
import {
  BASE_VARIABLES,
  EMAIL_TEMPLATES_PATH,
  EMAIL_TEMPLATE_QUERY_KEYS,
} from '../constants/email-templates.constant';
import {
  type EmailTemplateFormValues,
  emailTemplateSchema,
} from '../schemas/email-template.schema';
import type {
  EmailAudience,
  EmailTemplate,
} from '../types/email-template.types';
import { formatUpdatedAt } from '../utils/format-updated-at';
import EmailTemplateStatusBadge from './EmailTemplateStatusBadge';

const linkClass =
  'text-primary focus-visible:ring-ring inline-flex items-center gap-1.5 self-start rounded-sm text-body-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none';

export interface EmailTemplateDetailScreenProps {
  audience: EmailAudience;
  emailType: string;
}

/*
 * One email: point it at a mailtr template, optionally give it its own sender,
 * switch it on or off, see the variables its template receives, and send a
 * test to yourself.
 */
export default function EmailTemplateDetailScreen({
  audience,
  emailType,
}: EmailTemplateDetailScreenProps) {
  const queryClient = useQueryClient();
  const queryKey = EMAIL_TEMPLATE_QUERY_KEYS.one(audience, emailType);
  const template = useQuery({
    queryKey,
    queryFn: ({ signal }) => getEmailTemplate(audience, emailType, signal),
  });

  const backLink = (
    <Link href={EMAIL_TEMPLATES_PATH} className={linkClass}>
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      All email templates
    </Link>
  );

  if (template.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading the email template" />
      </div>
    );
  }

  if (template.isError) {
    const missing = isApiError(template.error) && template.error.status === 404;
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <EmptyState
          title={
            missing
              ? "SquadUp doesn't send this email"
              : "We couldn't load this email template"
          }
          description={getErrorMessage(template.error)}
          action={
            missing ? null : (
              <Button onClick={() => template.refetch()}>
                <RotateCw aria-hidden="true" className="h-4 w-4" />
                Try again
              </Button>
            )
          }
        />
      </div>
    );
  }

  const onSaved = (saved: EmailTemplate) => {
    queryClient.setQueryData(queryKey, saved);
    void queryClient.invalidateQueries({
      queryKey: EMAIL_TEMPLATE_QUERY_KEYS.all,
      exact: true,
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {backLink}
      <Header template={template.data} />
      {/* Remount on each save, so the form restarts from what was stored. */}
      <TemplateForm
        key={template.data.updatedAt ?? 'never-saved'}
        template={template.data}
        onSaved={onSaved}
      />
      <Variables variables={template.data.variables} />
      <TestSend template={template.data} />
    </div>
  );
}

function Header({ template }: { template: EmailTemplate }) {
  const updatedAt = formatUpdatedAt(template.updatedAt);
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Typography as="h1" variant="h2">
          {template.label}
        </Typography>
        <EmailTemplateStatusBadge status={template.status} />
      </div>
      <Typography className="text-muted-foreground max-w-2xl">
        {template.description}
      </Typography>
      <Typography variant="caption" className="text-muted-foreground">
        <span className="font-mono">
          {template.emailType} / {template.audience}
        </span>
        {updatedAt ? ` · Last changed ${updatedAt}` : ' · Never changed'}
      </Typography>
    </header>
  );
}

function TemplateForm({
  template,
  onSaved,
}: {
  template: EmailTemplate;
  onSaved: (saved: EmailTemplate) => void;
}) {
  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      templateId: template.templateId ?? '',
      fromEmail: template.fromEmail ?? '',
      isActive: template.isActive,
    },
  });
  const { errors, isDirty } = form.formState;
  const fields = {
    templateId: form.register('templateId'),
    fromEmail: form.register('fromEmail'),
    isActive: form.register('isActive'),
  };

  const save = useMutation({
    mutationFn: (values: EmailTemplateFormValues) =>
      updateEmailTemplate(template.audience, template.emailType, {
        templateId: values.templateId || null,
        fromEmail: values.fromEmail || null,
        isActive: values.isActive,
      }),
    onSuccess: (saved) => {
      toast.success('Saved. Every server picks it up within a minute.');
      onSaved(saved);
    },
  });

  return (
    <section
      aria-labelledby="template-heading"
      className="border-border flex flex-col gap-5 rounded-xl border p-5 md:p-6"
    >
      <Typography as="h2" variant="h5" id="template-heading">
        Mailtr template
      </Typography>

      <form
        noValidate
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        className="flex max-w-xl flex-col gap-5"
      >
        {save.isError ? (
          <Alert tone="danger">{getErrorMessage(save.error)}</Alert>
        ) : null}

        <FormField
          id="templateId"
          label="Template ID"
          error={errors.templateId?.message}
          hint="Copy it from mailtr, e.g. tpl_aB3xK9mZ. Leave it empty and this email isn't sent."
        >
          {(control) => (
            <Input
              {...control}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              {...fields.templateId}
            />
          )}
        </FormField>

        <FormField
          id="fromEmail"
          label="Sender"
          error={errors.fromEmail?.message}
          hint="Leave it empty to use the default sender (MAILTR_FROM_EMAIL)."
        >
          {(control) => (
            <Input
              {...control}
              type="email"
              inputMode="email"
              autoComplete="off"
              {...fields.fromEmail}
            />
          )}
        </FormField>

        <div className="flex items-start gap-3">
          <Checkbox
            id="isActive"
            aria-describedby="isActive-hint"
            {...fields.isActive}
          />
          <div className="flex flex-col gap-1">
            <label
              htmlFor="isActive"
              className="text-foreground text-body-sm cursor-pointer font-medium"
            >
              Send this email
            </label>
            <p
              id="isActive-hint"
              className="text-caption text-muted-foreground"
            >
              Switch it off to stop sending without losing the template ID.
            </p>
          </div>
        </div>

        <div>
          <Button type="submit" disabled={!isDirty || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Variables({ variables }: { variables: string[] }) {
  return (
    <section
      aria-labelledby="variables-heading"
      className="flex flex-col gap-3"
    >
      <Typography as="h2" variant="h5" id="variables-heading">
        Variables
      </Typography>
      <Typography variant="bodySmall" className="text-muted-foreground">
        Write the template against these names. Every email also gets{' '}
        {BASE_VARIABLES.map((name, index) => (
          <span key={name}>
            <code className="font-mono">{name}</code>
            {index < BASE_VARIABLES.length - 1 ? ', ' : '.'}
          </span>
        ))}
      </Typography>
      {variables.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {variables.map((name) => (
            <li
              key={name}
              className="border-border bg-muted/40 text-body-sm rounded-md border px-2 py-1 font-mono"
            >
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <Typography variant="bodySmall">
          This email sends no variables of its own.
        </Typography>
      )}
    </section>
  );
}

function TestSend({ template }: { template: EmailTemplate }) {
  const test = useMutation({
    mutationFn: () => sendTestEmail(template.audience, template.emailType),
    onSuccess: (result) =>
      toast.success(`Test email sent to ${result.to}. Check your inbox.`),
  });

  return (
    <section aria-labelledby="test-heading" className="flex flex-col gap-3">
      <Typography as="h2" variant="h5" id="test-heading">
        Test
      </Typography>
      <Typography
        variant="bodySmall"
        className="text-muted-foreground max-w-2xl"
      >
        Sends the saved template to your own staff email address, with sample
        values for its variables. It works while the email is switched off, so
        you can check a template before turning it on.
      </Typography>
      {test.isError ? (
        <Alert tone="danger">{getErrorMessage(test.error)}</Alert>
      ) : null}
      <div>
        <Button
          variant="outline"
          onClick={() => test.mutate()}
          disabled={!template.templateId || test.isPending}
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          {test.isPending ? 'Sending…' : 'Send a test to me'}
        </Button>
      </div>
      {!template.templateId ? (
        <Typography variant="caption" className="text-muted-foreground">
          Save a template ID first.
        </Typography>
      ) : null}
    </section>
  );
}
