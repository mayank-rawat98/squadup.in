import { Fragment } from 'react';
import { ArrowRight, Trophy } from 'lucide-react';
import {
  Avatar,
  AvatarGroup,
  Card,
  Container,
  MotionWrapper,
  Section,
  SectionHeading,
  Typography,
  cn,
} from '@squadup.in/ui';
import {
  ARENA_ACCENT_CLASS,
  BUILD_SQUAD_COPY,
  EXAMPLE_SQUAD,
  SQUAD_STEPS,
} from '../constants/landing.constant';

/*
 * The section that explains the product's name, so it leans human rather than
 * technical: avatars and squad cards, no code and no terminals.
 *
 * Three cards connected by arrows, and each card carries a small visual of the
 * thing it describes. The flow is Find, Form, Compete and nothing more.
 *
 * It closes on a brand statement instead of a button. A call to action here
 * would pull people out of the page one section before we have explained how
 * the platform works.
 */

/** Card 1 — an overlapping stack of the roles a squad tends to need. */
function FindVisual() {
  return (
    <div className="flex items-center gap-3">
      {/* No overflow count — it would be an invented number. */}
      <AvatarGroup size="md">
        {EXAMPLE_SQUAD.roles.map((member) => (
          <Avatar key={member.name} name={member.name} size="md" />
        ))}
      </AvatarGroup>
      <Typography variant="caption" className="text-muted-foreground">
        Frontend · Backend · DevOps · AI
      </Typography>
    </div>
  );
}

/** Card 2 — an example squad with a role assigned to each member. */
function SquadVisual() {
  return (
    <div className="border-border bg-secondary/40 rounded-lg border p-3">
      <Typography variant="caption" weight="semibold" className="mb-2 block">
        {EXAMPLE_SQUAD.name}
      </Typography>
      <ul className="grid grid-cols-2 gap-1.5">
        {EXAMPLE_SQUAD.roles.map((member) => (
          <li key={member.role} className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                ARENA_ACCENT_CLASS[member.accent].dot,
              )}
            />
            <Typography
              as="span"
              variant="micro"
              className="text-muted-foreground truncate"
            >
              {member.role}
            </Typography>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Card 3 — the same squad, now placed in an arena. */
function CompeteVisual() {
  return (
    <div className="border-border bg-secondary/40 flex items-center gap-3 rounded-lg border p-3">
      <span className="bg-arena-frontend-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <Trophy className="text-arena-frontend h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <Typography variant="caption" weight="semibold" className="truncate">
          Frontend Sprint
        </Typography>
        <Typography variant="micro" className="text-muted-foreground truncate">
          {EXAMPLE_SQUAD.name}
        </Typography>
      </div>
      <Typography
        as="span"
        variant="caption"
        weight="bold"
        className="text-primary shrink-0"
      >
        Rank #4
      </Typography>
    </div>
  );
}

const VISUALS = {
  find: FindVisual,
  create: SquadVisual,
  compete: CompeteVisual,
} as const;

function BuildSquadSection() {
  return (
    <Section id="squads" spacing="lg" tone="muted">
      <Container>
        <SectionHeading
          eyebrow="Why we are called SquadUp"
          title={BUILD_SQUAD_COPY.title}
          subtitle={BUILD_SQUAD_COPY.subtitle}
        />

        {/*
         * Flex rather than a grid so the connectors can sit between the cards
         * as real elements. They rotate a quarter turn when the row stacks.
         */}
        <div className="mt-12 flex flex-col items-stretch gap-4 md:mt-16 lg:flex-row lg:gap-5">
          {SQUAD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const Visual = VISUALS[step.id as keyof typeof VISUALS];

            return (
              <Fragment key={step.id}>
                <MotionWrapper
                  delay={0.15 + index * 0.12}
                  fullWidth
                  className="lg:flex-1"
                >
                  <Card
                    interactive
                    padding="md"
                    className="flex h-full flex-col gap-4"
                  >
                    <span className="bg-accent flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                      <Icon
                        className="text-primary h-5 w-5"
                        aria-hidden="true"
                      />
                    </span>

                    <div className="flex flex-1 flex-col gap-2">
                      <Typography as="h3" variant="h5" weight="semibold">
                        {step.title}
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="text-muted-foreground"
                      >
                        {step.description}
                      </Typography>
                    </div>

                    <Visual />
                  </Card>
                </MotionWrapper>

                {index < SQUAD_STEPS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="flex shrink-0 items-center justify-center lg:self-center"
                  >
                    <ArrowRight className="text-primary/40 h-5 w-5 rotate-90 lg:rotate-0" />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        <MotionWrapper delay={0.5} className="mt-12 md:mt-16">
          <Typography
            as="p"
            variant="displaySm"
            align="center"
            className="mx-auto max-w-2xl text-balance"
          >
            {BUILD_SQUAD_COPY.statement}
          </Typography>
        </MotionWrapper>
      </Container>
    </Section>
  );
}

BuildSquadSection.displayName = 'BuildSquadSection';

export default BuildSquadSection;
