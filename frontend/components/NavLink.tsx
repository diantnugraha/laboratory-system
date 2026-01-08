'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href?: string;
  to?: string;
  className?: string;
  activeClassName?: string;
  end?: boolean;
  children?: React.ReactNode;
  [key: string]: any;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, href, to, end, children, ...props }, ref) => {
    const pathname = usePathname();
    // Support both 'to' (react-router style) and 'href' (Next.js style)
    const linkHref = href || to || '/';
    
    // Check if link is active
    let isActive = false;
    if (end) {
      // Exact match if 'end' prop is provided
      isActive = pathname === linkHref;
    } else {
      // Match if pathname starts with linkHref
      isActive = pathname === linkHref || pathname?.startsWith(linkHref + '/');
    }

    return (
      <Link
        ref={ref}
        href={linkHref}
        className={cn(className, isActive && activeClassName)}
        {...props}
      >
        {children}
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };

