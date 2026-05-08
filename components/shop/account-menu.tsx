'use client';

import { LogIn, LogOut, MapPin, Package, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
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
    return (
      <Button asChild variant="ghost" size="icon" aria-label="Sign in">
        <Link href="/login">
          <LogIn aria-hidden className="size-5" />
        </Link>
      </Button>
    );
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
