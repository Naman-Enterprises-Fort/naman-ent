'use client';

import { LogIn, LogOut, MapPin, Package, ShieldCheck, User, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface AccountMenuProps {
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
}

export function AccountMenu({ user }: AccountMenuProps) {
  if (!user) {
    return <UnauthenticatedMenu />;
  }

  const initial = (user.name ?? user.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full">
          <span className="grid size-7 place-items-center rounded-full bg-foreground text-[11px] text-background">
            {initial}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="font-normal">
          <div className="space-y-0.5">
            <p className="font-medium text-sm">{user.name ?? 'Your account'}</p>
            {user.email ? (
              <p className="truncate text-muted-foreground text-xs">{user.email}</p>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User aria-hidden />
            Overview
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package aria-hidden />
            Orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/addresses">
            <MapPin aria-hidden />
            Addresses
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/security">
            <ShieldCheck aria-hidden />
            Security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault();
            signOut({ callbackUrl: '/' });
          }}
        >
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Guest-state account control. Hover OR click reveals a small dropdown
 * with both Sign-in + Create-account links — discoverable for users who
 * don't immediately know which they need, without forcing a navigate.
 *
 * Hover is implemented with a 150ms close delay so cursor travel from the
 * trigger to the menu items doesn't dismiss the menu mid-glide. The Radix
 * primitives we already use for the signed-in menu accept a controlled
 * `open` prop, so we reuse them and skip a bespoke component.
 */
function UnauthenticatedMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign in or create account"
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
        >
          <User aria-hidden className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[13rem]"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium text-sm">Welcome</p>
          <p className="text-muted-foreground text-xs">Sign in or create an account.</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login">
            <LogIn aria-hidden />
            Sign in
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/register">
            <UserPlus aria-hidden />
            Create an account
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
