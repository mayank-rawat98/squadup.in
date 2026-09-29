import Link from 'next/link';
import { UserX } from 'lucide-react';
import { Container, EmptyState, buttonVariants } from '@squadup.in/ui';
import { SiteFooter, SiteHeader } from '@/components/organisms';

export default function ProfileNotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <Container width="prose" className="pt-28 pb-16 md:pt-36">
          <EmptyState
            icon={UserX}
            title="No one has that username"
            description="Check the spelling. Usernames are lowercase letters, numbers, _ and -."
            action={
              <Link href="/" className={buttonVariants({ variant: 'outline' })}>
                Go to the home page
              </Link>
            }
          />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
