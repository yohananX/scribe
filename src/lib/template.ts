import { z } from "zod";

export const LOGO_POSITIONS = ["left", "center", "right"] as const;
export const FONT_FAMILIES = ["inter", "georgia", "courier"] as const;
export const FONT_SCALES = ["sm", "md", "lg"] as const;
export const NUMBERING_STYLES = ["numeric", "subparts"] as const;
export const MARGIN_OPTIONS = [10, 12, 15, 20, 25] as const;

export const TITLE_BLOCK_FIELDS = [
  "subject",
  "class",
  "term",
  "date",
  "duration",
  "totalMarks",
] as const;

export const titleFieldsSchema = z.enum(TITLE_BLOCK_FIELDS);
export type TitleBlockField = (typeof TITLE_BLOCK_FIELDS)[number];

export const logoPositionSchema = z.enum(LOGO_POSITIONS);
export const fontFamilySchema = z.enum(FONT_FAMILIES);
export const fontScaleSchema = z.enum(FONT_SCALES);
export const numberingStyleSchema = z.enum(NUMBERING_STYLES);

export const templateConfigSchema = z.object({
  logo: z
    .object({
      path: z.string(),
      url: z.string().optional(),
      width: z.number().min(48).max(220),
      position: logoPositionSchema,
    })
    .nullable(),
  schoolName: z.object({
    enabled: z.boolean(),
    name: z.string().max(120),
    address: z.string().max(200),
  }),
  header: z.object({
    showRule: z.boolean(),
  }),
  footer: z.object({
    showPageNumbers: z.boolean(),
    fixedText: z.string().max(120),
  }),
  typography: z.object({
    fontFamily: fontFamilySchema,
    fontSize: fontScaleSchema,
  }),
  margins: z.object({
    horizontal: z.number(),
    vertical: z.number(),
  }),
  numbering: z.object({
    style: numberingStyleSchema,
  }),
  titleBlock: z.object({
    fields: z.array(titleFieldsSchema),
  }),
});

export type LogoConfig = NonNullable<z.infer<typeof templateConfigSchema>["logo"]>;
export type TemplateConfig = z.infer<typeof templateConfigSchema>;

export const TITLE_BLOCK_FIELD_LABELS: Record<TitleBlockField, string> = {
  subject: "Subject",
  class: "Class",
  term: "Term",
  date: "Date",
  duration: "Duration",
  totalMarks: "Total Marks",
};

export const defaultTemplateConfig: TemplateConfig = {
  logo: null,
  schoolName: {
    enabled: true,
    name: "",
    address: "",
  },
  header: {
    showRule: true,
  },
  footer: {
    showPageNumbers: true,
    fixedText: "",
  },
  typography: {
    fontFamily: "inter",
    fontSize: "md",
  },
  margins: {
    horizontal: 15,
    vertical: 15,
  },
  numbering: {
    style: "numeric",
  },
  titleBlock: {
    fields: [...TITLE_BLOCK_FIELDS],
  },
};

export function normalizeTemplateConfig(input: unknown): TemplateConfig {
  const parsed = templateConfigSchema.safeParse(input);

  if (!parsed.success) {
    return defaultTemplateConfig;
  }

  return {
    ...defaultTemplateConfig,
    ...parsed.data,
    logo: parsed.data.logo ? { ...parsed.data.logo } : null,
    schoolName: { ...defaultTemplateConfig.schoolName, ...parsed.data.schoolName },
    header: { ...defaultTemplateConfig.header, ...parsed.data.header },
    footer: { ...defaultTemplateConfig.footer, ...parsed.data.footer },
    typography: { ...defaultTemplateConfig.typography, ...parsed.data.typography },
    margins: { ...defaultTemplateConfig.margins, ...parsed.data.margins },
    numbering: { ...defaultTemplateConfig.numbering, ...parsed.data.numbering },
    titleBlock: { ...defaultTemplateConfig.titleBlock, ...parsed.data.titleBlock },
  };
}

const mmToPx = (mm: number) => Math.round(mm * 3.78);

export function pagePadding(config: TemplateConfig) {
  return {
    paddingTop: mmToPx(config.margins.vertical),
    paddingBottom: mmToPx(config.margins.vertical),
    paddingLeft: mmToPx(config.margins.horizontal),
    paddingRight: mmToPx(config.margins.horizontal),
  };
}

export function fontStack(fontFamily: TemplateConfig["typography"]["fontFamily"]) {
  switch (fontFamily) {
    case "georgia":
      return '"Georgia", "Times New Roman", serif';
    case "courier":
      return '"Courier New", "Courier", monospace';
    case "inter":
    default:
      return '"Inter", ui-sans-serif, system-ui, sans-serif';
  }
}

export function bodyFontSize(fontSize: TemplateConfig["typography"]["fontSize"]) {
  switch (fontSize) {
    case "sm":
      return 13;
    case "lg":
      return 16;
    case "md":
    default:
      return 14;
  }
}