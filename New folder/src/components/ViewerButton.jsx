import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const LOCK_MSG = 'אנא הרשם כדי לערוך באירוע';

export default function ViewerButton({ canEdit, children, className, variant, size, type, disabled, ...rest }) {
  if (canEdit) {
    return (
      <Button className={className} variant={variant} size={size} type={type} disabled={disabled} {...rest}>
        {children}
      </Button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            disabled
            aria-disabled
            variant={variant}
            size={size}
            className={cn(className, 'bg-stone-100 text-stone-400 border-stone-200 hover:bg-stone-100 hover:text-stone-400')}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{LOCK_MSG}</TooltipContent>
    </Tooltip>
  );
}