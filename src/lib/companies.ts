// Issuing companies that can appear on an invoice.
// Legal details (business IDs, full addresses, bank accounts) can be refined later —
// unknown fields are left blank and simply hidden on the PDF.

export type CompanyId =
  | "visit-lapland"
  | "ttt-dmc"
  | "ttt-india"
  | "ruka"
  | "rovaniemi"
  | "soulvia";

export type Company = {
  id: CompanyId;
  name: string;        // full legal name (dropdown + PDF fallback)
  short: string;       // short label for chips / calendar
  color: string;       // hex used for calendar dots + accents
  name1: string; name2: string; name3: string; suffix: string; // header styling (3 lines)
  tagline: string;
  businessId: string;
  address: string;
  email: string;
  phone: string;
  web: string;
};

export const COMPANIES: Company[] = [
  {
    id: "ttt-dmc",
    short: "TTT DMC", color: "#0ea5a4",
    name: "Trekking Trails Travels DMC Oy",
    name1: "TREKKING TRAILS", name2: "TRAVELS", name3: "DMC", suffix: "Oy",
    tagline: "Arctic & Nordic Destination Management",
    businessId: "", address: "Lapland, Finland",
    email: "info@trekkingtrailstravels.com", phone: "", web: "trekkingtrailstravels.com",
  },
  {
    id: "ttt-india",
    short: "TTT India", color: "#f59e0b",
    name: "Trekking Trails Travels India",
    name1: "TREKKING TRAILS", name2: "TRAVELS", name3: "INDIA", suffix: "",
    tagline: "Your Journey, Our Trails",
    businessId: "", address: "India",
    email: "info@trekkingtrailstravels.com", phone: "", web: "trekkingtrailstravelsindia.com",
  },
  {
    id: "visit-lapland",
    short: "Visit Lapland", color: "#6366f1",
    name: "Visit Lapland Finland Travels Oy",
    name1: "VISIT LAPLAND", name2: "FINLAND", name3: "TRAVELS", suffix: "Oy",
    tagline: "Your Trusted Travel Partner for Finland & Lapland",
    businessId: "3376481-6", address: "Ruka – Kuusamo, 93600, Lapland, Finland",
    email: "info@laplandfinlandtravels.com", phone: "", web: "laplandfinlandtravels.com",
  },
  {
    id: "ruka",
    short: "Ruka", color: "#10b981",
    name: "Ruka Northern Lights Tours",
    name1: "RUKA NORTHERN", name2: "LIGHTS", name3: "TOURS", suffix: "",
    tagline: "Chase the Aurora in Ruka–Kuusamo",
    businessId: "", address: "Ruka – Kuusamo, Finland",
    email: "", phone: "", web: "",
  },
  {
    id: "rovaniemi",
    short: "Rovaniemi", color: "#ec4899",
    name: "Rovaniemi Northern Lights Tours",
    name1: "ROVANIEMI NORTHERN", name2: "LIGHTS", name3: "TOURS", suffix: "",
    tagline: "Aurora Adventures from Rovaniemi",
    businessId: "", address: "Rovaniemi, Finland",
    email: "", phone: "", web: "rovanieminorthernlightstours.com",
  },
  {
    id: "soulvia",
    short: "SoulVia", color: "#8b5cf6",
    name: "SoulVia Journeys LLC",
    name1: "SOULVIA", name2: "JOURNEYS", name3: "LLC", suffix: "",
    tagline: "Nordic Journeys, Soulful Experiences",
    businessId: "", address: "United States",
    email: "", phone: "", web: "soulviajourneys.com",
  },
];

export const DEFAULT_COMPANY: CompanyId = "ttt-dmc";

export function getCompany(id?: string | null): Company {
  return COMPANIES.find(c => c.id === id) ?? COMPANIES.find(c => c.id === DEFAULT_COMPANY)!;
}
