import React from 'react';
import Link from 'next/link';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionText,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-card/50">
      <div className="w-14 h-14 mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon || <PackageOpen className="w-7 h-7" />}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionText && actionHref && (
        <Button asChild>
          <Link href={actionHref}>{actionText}</Link>
        </Button>
      )}
    </div>
  );
}
