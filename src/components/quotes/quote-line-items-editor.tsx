"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EditableLineItem = {
  type: "LABOR" | "MATERIAL";
  description: string;
  quantity: string;
  unitPrice: string; // euros, e.g. "45.50"
};

export function newLineItem(): EditableLineItem {
  return { type: "LABOR", description: "", quantity: "1", unitPrice: "" };
}

// Select.Value only resolves an item's label from a value without opening the popup
// once if Select.Root is given an explicit items map.
const typeItems = { LABOR: "Työ", MATERIAL: "Materiaali" };

export function QuoteLineItemsEditor({
  items,
  onChange,
}: {
  items: EditableLineItem[];
  onChange: (items: EditableLineItem[]) => void;
}) {
  function updateItem(index: number, patch: Partial<EditableLineItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-12 items-center gap-2">
          <div className="col-span-2">
            <Select
              items={typeItems}
              value={item.type}
              onValueChange={(value) => updateItem(index, { type: value as EditableLineItem["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LABOR">Työ</SelectItem>
                <SelectItem value="MATERIAL">Materiaali</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            className="col-span-4"
            placeholder="Kuvaus"
            value={item.description}
            onChange={(e) => updateItem(index, { description: e.target.value })}
          />
          <Input
            className="col-span-2"
            type="number"
            min="0"
            step="0.5"
            placeholder="Määrä"
            value={item.quantity}
            onChange={(e) => updateItem(index, { quantity: e.target.value })}
          />
          <Input
            className="col-span-3"
            type="number"
            min="0"
            step="0.01"
            placeholder="À-hinta €"
            value={item.unitPrice}
            onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="col-span-1"
            aria-label="Poista rivi"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            disabled={items.length === 1}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...items, newLineItem()])}>
        Lisää rivi
      </Button>
    </div>
  );
}
