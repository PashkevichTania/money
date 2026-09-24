import { ArrowLeftRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export function Brand({
  className,
  to = '/dashboard',
  onClick,
}: {
  className?: string;
  to?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-3 rounded-md font-semibold tracking-tight',
        className
      )}
      aria-label="SplitSmart"
    >
      <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
        <ArrowLeftRight className="size-5" aria-hidden="true" />
      </span>
      <span className="text-xl">
        SplitSmart<span className="text-positive">.</span>
      </span>
    </Link>
  );
}
