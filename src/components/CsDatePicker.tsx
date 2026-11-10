import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import "@/styles/csDatePickerExecutive.css";

// cs-date-picker-executive-v1

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

function paraData(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [ano, mes, dia] = value.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia, 12);

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return undefined;
  }

  return data;
}

function paraISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatar(value: string): string {
  if (!paraData(value)) return "dd/mm/aaaa";

  const [ano, mes, dia] = value.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function CsDatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
  ariaLabel = "Selecionar data",
}: Props) {
  const [aberto, setAberto] = useState(false);
  const selecionada = paraData(value);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cs-date-v1-trigger"
          aria-label={`${ariaLabel}: ${value ? formatar(value) : placeholder}`}
          aria-expanded={aberto}
        >
          <CalendarDays
            size={16}
            aria-hidden="true"
            className="cs-date-v1-icon"
          />

          <span data-vazio={!selecionada}>
            {selecionada ? formatar(value) : "dd/mm/aaaa"}
          </span>

          <ChevronDown
            size={15}
            aria-hidden="true"
            className="cs-date-v1-chevron"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="cs-date-v1-popover"
      >
        <div className="cs-date-v1-heading">
          <strong>{placeholder}</strong>
          <span>Selecione uma data</span>
        </div>

        <Calendar
          mode="single"
          selected={selecionada}
          defaultMonth={selecionada ?? new Date()}
          onSelect={(dia) => {
            if (!dia) return;
            onChange(paraISO(dia));
            setAberto(false);
          }}
          locale={ptBR}
          showOutsideDays={false}
          className="cs-date-v1-calendar"
        />

        <div className="cs-date-v1-footer">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setAberto(false);
            }}
          >
            Limpar data
          </button>

          <button
            type="button"
            onClick={() => {
              onChange(paraISO(new Date()));
              setAberto(false);
            }}
          >
            Hoje
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
