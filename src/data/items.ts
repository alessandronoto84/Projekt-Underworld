import type { IconKind } from '../art/objects';
import { P } from '../art/palette';

/**
 * Alle Gegenstände des Spiels. Neue Items: hier eintragen – Inventar, Handel,
 * Speichern und UI funktionieren automatisch.
 *
 * Drogen sind fiktive Spielgegenstände mit abstrakten Werten. Herstellung und
 * Verarbeitung sind reine Spielmechanik (Gegenstand + Maschine + Zeit).
 */
export type ItemCategory = 'tool' | 'seed' | 'crop' | 'drug' | 'supply' | 'placeable' | 'food' | 'quest';

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  icon: IconKind;
  tint?: string;
  category: ItemCategory;
  stack: number;
  /** Referenzwert in $ (Handelskanäle leiten ihre Preise davon ab). */
  value: number;
  /** Abstraktes Risiko 0–1 (beeinflusst später Polizei/Verdacht). */
  risk?: number;
  tool?: 'hoe' | 'can';
  seedOf?: string;      // Crop-ID
  placeable?: string;   // Maschinen-ID
  energy?: number;      // Essen: Energie-Wiederherstellung
}

export const ITEMS: Record<string, ItemDef> = {
  hoe: { id: 'hoe', name: 'Hacke', desc: 'Lockert die Erde auf der Anbaufläche auf.', icon: 'hoe', category: 'tool', stack: 1, value: 0, tool: 'hoe' },
  watering_can: { id: 'watering_can', name: 'Gießkanne', desc: 'Gießt Pflanzen. Am Teich oder an der Regentonne auffüllen.', icon: 'can', category: 'tool', stack: 1, value: 0, tool: 'can' },

  seed_cannabis: { id: 'seed_cannabis', name: 'Cannabis-Steckling', desc: 'Erntereif nach 3 Tagen, wenn täglich gegossen.', icon: 'clone', category: 'seed', stack: 99, value: 8, seedOf: 'cannabis', risk: 0.1 },
  seed_tomate: { id: 'seed_tomate', name: 'Tomatensamen', desc: 'Legale Ware – gut als Tarnung. Reif nach 3 Tagen, trägt danach weiter.', icon: 'seedBag', tint: P.r2, category: 'seed', stack: 99, value: 4, seedOf: 'tomate' },

  cannabis_frisch: { id: 'cannabis_frisch', name: 'Cannabis (frisch)', desc: 'Frisch geerntet. Muss erst im Trockengestell getrocknet werden.', icon: 'budFresh', category: 'crop', stack: 99, value: 14, risk: 0.2 },
  tomate: { id: 'tomate', name: 'Tomate', desc: 'Saftig und völlig legal. Kramer kauft sie.', icon: 'tomato', category: 'crop', stack: 99, value: 22 },

  cannabis: { id: 'cannabis', name: 'Cannabis', desc: 'Getrocknet und verkaufsfertig. Dein Brot-und-Butter-Geschäft.', icon: 'budBag', category: 'drug', stack: 99, value: 40, risk: 0.2 },
  kit_mdma: { id: 'kit_mdma', name: 'MDMA-Rohstoffkit', desc: 'Abstraktes Rohstoffpaket von Rico. Wird in der Pillenpresse verarbeitet.', icon: 'kit', tint: P.pink, category: 'supply', stack: 20, value: 120, risk: 0.4 },
  ecstasy: { id: 'ecstasy', name: 'Ecstasy', desc: 'Bunte Pillen. Im Nachtleben heiß begehrt.', icon: 'pills', tint: P.pink, category: 'drug', stack: 99, value: 28, risk: 0.4 },
  kokain_gross: { id: 'kokain_gross', name: 'Kokain (Großmenge)', desc: 'Ein verschnürtes Großpaket. Am Packtisch in Verkaufseinheiten aufteilen.', icon: 'brick', category: 'supply', stack: 10, value: 900, risk: 0.8 },
  kokain: { id: 'kokain', name: 'Kokain', desc: 'Verkaufseinheit. Teuer, gefragt bei zahlungskräftiger Kundschaft – und riskant.', icon: 'baggie', tint: P.white, category: 'drug', stack: 99, value: 110, risk: 0.7 },

  drying_rack: { id: 'drying_rack', name: 'Trockengestell', desc: 'Platzierbar. Trocknet frisches Cannabis.', icon: 'rackItem', category: 'placeable', stack: 10, value: 300, placeable: 'drying_rack' },
  pill_press: { id: 'pill_press', name: 'Pillenpresse', desc: 'Platzierbar. Verarbeitet MDMA-Rohstoffkits zu Ecstasy.', icon: 'pressItem', category: 'placeable', stack: 5, value: 900, placeable: 'pill_press' },
  pack_table: { id: 'pack_table', name: 'Packtisch', desc: 'Platzierbar. Teilt Großmengen in Verkaufseinheiten auf.', icon: 'packItem', category: 'placeable', stack: 5, value: 1500, placeable: 'pack_table' },

  sandwich: { id: 'sandwich', name: 'Sandwich', desc: 'Stellt 40 Energie wieder her.', icon: 'sandwich', category: 'food', stack: 20, value: 25, energy: 40 },
  coffee: { id: 'coffee', name: 'Nachtschicht-Kaffee', desc: 'Stellt 20 Energie wieder her.', icon: 'coffee', category: 'food', stack: 20, value: 12, energy: 20 },

  letter_uncle: { id: 'letter_uncle', name: 'Brief von Onkel Theo', desc: '„Das Grundstück gehört jetzt dir. Rico weiß Bescheid.“', icon: 'letter', category: 'quest', stack: 1, value: 0 },
};

export function item(id: string): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error(`Unbekanntes Item: ${id}`);
  return d;
}
