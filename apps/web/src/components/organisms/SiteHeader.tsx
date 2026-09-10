'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Container, buttonVariants, cn } from '@squadup.in/ui';
import Logo from '@/components/atoms/Logo';
import { AUTH_LINKS, PRIMARY_NAV } from '@/config/navigation';

/*
 * Sticky, and transparent while it sits over the hero photograph.
 *
 * At the top of the page the header carries `surface-light`, which pins its
 * tokens to the light palette. That is necessary because the hero image is
 * bright daylight in every theme, so a dark-theme header over it would be dark
 * text on a dark bar over a light photo. Once the user scrolls past the hero
 * the class comes off and the header follows the active theme normally.
 */

const SCROLL_THRESHOLD = 24;

function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* An open menu must not leave the page scrolling underneath it. */
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const overHero = !scrolled && !menuOpen;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        overHero
          ? 'surface-light bg-transparent'
          : 'bg-background/85 border-border border-b backdrop-blur-md',
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 md:h-18">
          <Logo />

          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 lg:flex"
          >
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-foreground/80 hover:text-foreground hover:bg-accent focus-visible:ring-ring rounded-md px-3 py-2 text-body-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={AUTH_LINKS.login.href}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'default' }),
                'hidden sm:inline-flex',
              )}
            >
              {AUTH_LINKS.login.label}
            </Link>
            <Link
              href={AUTH_LINKS.signup.href}
              className={cn(buttonVariants({ size: 'default' }))}
            >
              {AUTH_LINKS.signup.label}
            </Link>

            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
              className="text-foreground hover:bg-accent focus-visible:ring-ring -mr-2 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none lg:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {menuOpen && (
        <div
          id="site-menu"
          className="border-border bg-background border-t lg:hidden"
        >
          <Container>
            <nav aria-label="Mobile" className="flex flex-col gap-1 py-4">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-foreground hover:bg-accent rounded-md px-3 py-3 text-body font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={AUTH_LINKS.login.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: 'outline', fullWidth: true }),
                  'mt-3 sm:hidden',
                )}
              >
                {AUTH_LINKS.login.label}
              </Link>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}

SiteHeader.displayName = 'SiteHeader';

export default SiteHeader;
