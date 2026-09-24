import type { ReactElement, ReactNode } from 'react';
import { cn } from './cn';
import { Heading, Text } from './text';

export interface EmptyStateProps {
  title: ReactNode;
  body?: ReactNode;
  // One door: a single element, typically a Button (brand-and-design.md §5 Empty states).
  action?: ReactElement;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, body, action, icon, className }: EmptyStateProps) {
  return (
    <section
      className={cn(
        'flex flex-col items-center gap-4 rounded-crisp border border-dashed border-hairline px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <Heading level={2} size="md">
        {title}
      </Heading>
      {body ? (
        <Text tone="muted" className="max-w-sm">
          {body}
        </Text>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </section>
  );
}
