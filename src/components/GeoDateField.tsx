import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface GeoDateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
}

export function GeoDateField({
  label,
  value,
  onChange,
  minDate,
}: GeoDateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Selecionar data ${label}`}
            className="inline-flex h-9 w-[150px]
              items-center justify-between gap-2
              rounded-lg border border-border/70
              bg-background/40 px-3 text-xs
              text-foreground transition-colors
              hover:border-primary/50
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary/50"
          >
            <span className={
              value ? "font-medium" : "text-muted-foreground"
            }>
              {value
                ? format(parseISO(value), "dd/MM/yyyy")
                : "dd/mm/aaaa"}
            </span>
            <CalendarDays
              className="h-4 w-4 shrink-0 text-muted-foreground"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="z-[100] w-auto rounded-xl
            border border-border/70 bg-popover
            p-2 text-popover-foreground
            shadow-2xl backdrop-blur-xl"
        >
          <Calendar
            mode="single"
            locale={ptBR}
            showOutsideDays={false}
            selected={value ? parseISO(value) : undefined}
            defaultMonth={value ? parseISO(value) : undefined}
            disabled={
              minDate
                ? { before: parseISO(minDate) }
                : undefined
            }
            onSelect={date => {
              if (!date) return;
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }}
            classNames={{
              day_selected:
                "!bg-[#F7304E] !text-white hover:!bg-[#F7304E] hover:!text-white focus:!bg-[#F7304E]",
              day_today:
                "border border-primary/40 font-semibold",
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
