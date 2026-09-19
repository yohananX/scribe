"use client";

import { useRef, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { saveTemplate, type SaveTemplateResult } from "@/app/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { ExamPreview } from "@/components/template/ExamPreview";
import { sampleExam } from "@/components/template/sampleExam";
import {
  FONT_FAMILIES,
  FONT_SCALES,
  LOGO_POSITIONS,
  MARGIN_OPTIONS,
  NUMBERING_STYLES,
  TITLE_BLOCK_FIELDS,
  TITLE_BLOCK_FIELD_LABELS,
  type TemplateConfig,
  type TitleBlockField,
} from "@/lib/template";
import { createClient } from "@/lib/supabase/client";

type TemplateEditorProps = {
  initialConfig: TemplateConfig;
  orgId: string;
};

type LogoPosition = NonNullable<TemplateConfig["logo"]>["position"];

const FONT_FAMILY_LABELS: Record<(typeof FONT_FAMILIES)[number], string> = {
  inter: "Clean sans (Inter)",
  georgia: "Classic serif (Georgia)",
  courier: "Typewriter (Courier)",
};

const FONT_SCALE_LABELS: Record<(typeof FONT_SCALES)[number], string> = {
  sm: "Compact",
  md: "Standard",
  lg: "Large",
};

const NUMBERING_LABELS: Record<(typeof NUMBERING_STYLES)[number], string> = {
  numeric: "1, 2, 3",
  subparts: "1a, 1b",
};

const POSITION_LABELS: Record<(typeof LOGO_POSITIONS)[number], string> = {
  left: "Left",
  center: "Centre",
  right: "Right",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {description && <p className="text-sm text-neutral-600">{description}</p>}
      </div>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </Card>
  );
}

export function TemplateEditor({ initialConfig, orgId }: TemplateEditorProps) {
  const [config, setConfig] = useState<TemplateConfig>(initialConfig);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"settings" | "preview">("settings");
  const [saveState, setSaveState] = useState<SaveTemplateResult | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(mutate: (prev: TemplateConfig) => TemplateConfig) {
    setConfig(mutate);
    setDirty(true);
    setSaveState(null);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveTemplate(config);
      setSaveState(result);
      if (result.ok) {
        setDirty(false);
      }
    });
  }

  async function handleLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setLogoError("Please choose a PNG or JPG image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("The image is too large. Keep it under 2 MB.");
      return;
    }

    setLogoBusy(true);
    setLogoError(null);

    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${orgId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (error) throw error;

      const { data: signed } = await supabase.storage
        .from("logos")
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      if (!signed) throw new Error("No signed URL returned");

      update((c) => ({
        ...c,
        logo: {
          path,
          url: signed.signedUrl,
          width: c.logo?.width ?? 90,
          position: c.logo?.position ?? "center",
        },
      }));
    } catch {
      setLogoError("Could not upload the logo. Please try again.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    const logo = config.logo;
    update((c) => ({ ...c, logo: null }));

    if (logo?.path) {
      try {
        await createClient().storage.from("logos").remove([logo.path]);
      } catch {
        // The config is already updated; the storage cleanup is best-effort.
      }
    }
  }

  function toggleTitleField(field: TitleBlockField) {
    update((c) => {
      const fields = c.titleBlock.fields.includes(field)
        ? c.titleBlock.fields.filter((f) => f !== field)
        : [...c.titleBlock.fields, field];

      return { ...c, titleBlock: { ...c.titleBlock, fields } };
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">School Template</h1>
          <p className="mt-1 text-neutral-600">
            Set the official exam look once and it applies to every exam your
            teachers create.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <Badge variant="warning">Unsaved changes</Badge>}
          <Button type="button" onClick={handleSave} disabled={pending || !dirty}>
            {pending ? "Saving..." : "Save template"}
          </Button>
        </div>
      </div>

      {saveState && !saveState.ok && (
        <div className="mb-5">
          <Alert variant="error">{saveState.message}</Alert>
        </div>
      )}
      {saveState && saveState.ok && (
        <div className="mb-5">
          <Alert variant="success">{saveState.message}</Alert>
        </div>
      )}

      <div className="mb-4 flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setTab("settings")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
            tab === "settings"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-700"
          }`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
            tab === "preview"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-700"
          }`}
        >
          Preview
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div
          className={`flex flex-col gap-4 ${
            tab === "settings" ? "" : "hidden lg:flex"
          }`}
        >
          <Section
            title="Logo"
            description="Your school logo appears in the top header of every exam."
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleLogoFile}
            />
            {!config.logo ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoBusy}
              >
                {logoBusy ? "Uploading..." : "Upload logo"}
              </Button>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  {config.logo.url && (
                    <img
                      src={config.logo.url}
                      alt="School logo"
                      className="h-12 rounded-md border border-neutral-200 object-contain"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={logoBusy}
                    >
                      {logoBusy ? "Uploading..." : "Replace"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeLogo}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center justify-between text-sm font-medium text-neutral-700">
                    Size
                    <span className="text-neutral-500">{config.logo.width}px</span>
                  </label>
                  <input
                    type="range"
                    min={48}
                    max={220}
                    value={config.logo.width}
                    onChange={(event) =>
                      update((c) =>
                        c.logo
                          ? { ...c, logo: { ...c.logo, width: Number(event.target.value) } }
                          : c
                      )
                    }
                    className="accent-primary-600"
                  />
                </div>

                <Select
                  label="Position"
                  value={config.logo.position}
                  onChange={(event) =>
                    update((c) =>
                      c.logo
                        ? {
                            ...c,
                            logo: {
                              ...c.logo,
                              position: event.target.value as LogoPosition,
                            },
                          }
                        : c
                    )
                  }
                >
                  {LOGO_POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {POSITION_LABELS[position]}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <p className="text-xs text-neutral-500">
              PNG or JPG, under 2 MB. Square or wide images work best.
            </p>
            {logoError && <p className="text-sm text-error-600">{logoError}</p>}
          </Section>

          <Section
            title="School name"
            description="Show the school name and address in the header, or hide it if the logo already includes it."
          >
            <Toggle
              label="Show school name"
              checked={config.schoolName.enabled}
              onChange={(enabled) =>
                update((c) => ({ ...c, schoolName: { ...c.schoolName, enabled } }))
              }
            />
            {config.schoolName.enabled && (
              <>
                <Input
                  label="School name"
                  value={config.schoolName.name}
                  onChange={(event) =>
                    update((c) => ({
                      ...c,
                      schoolName: { ...c.schoolName, name: event.target.value },
                    }))
                  }
                />
                <Input
                  label="Address / contact details"
                  value={config.schoolName.address}
                  onChange={(event) =>
                    update((c) => ({
                      ...c,
                      schoolName: { ...c.schoolName, address: event.target.value },
                    }))
                  }
                />
              </>
            )}
          </Section>

          <Section
            title="Layout"
            description="Header, footer, typography, margins and question numbering."
          >
            <Toggle
              label="Rule under header"
              hint="A thin line below the school name and logo"
              checked={config.header.showRule}
              onChange={(showRule) =>
                update((c) => ({ ...c, header: { ...c.header, showRule } }))
              }
            />
            <Select
              label="Font"
              value={config.typography.fontFamily}
              onChange={(event) =>
                update((c) => ({
                  ...c,
                  typography: {
                    ...c.typography,
                    fontFamily: event.target.value as TemplateConfig["typography"]["fontFamily"],
                  },
                }))
              }
            >
              {FONT_FAMILIES.map((family) => (
                <option key={family} value={family}>
                  {FONT_FAMILY_LABELS[family]}
                </option>
              ))}
            </Select>
            <Select
              label="Text size"
              value={config.typography.fontSize}
              onChange={(event) =>
                update((c) => ({
                  ...c,
                  typography: {
                    ...c.typography,
                    fontSize: event.target.value as TemplateConfig["typography"]["fontSize"],
                  },
                }))
              }
            >
              {FONT_SCALES.map((size) => (
                <option key={size} value={size}>
                  {FONT_SCALE_LABELS[size]}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Side margins"
                value={config.margins.horizontal}
                onChange={(event) =>
                  update((c) => ({
                    ...c,
                    margins: { ...c.margins, horizontal: Number(event.target.value) },
                  }))
                }
              >
                {MARGIN_OPTIONS.map((margin) => (
                  <option key={margin} value={margin}>
                    {margin} mm
                  </option>
                ))}
              </Select>
              <Select
                label="Top / bottom"
                value={config.margins.vertical}
                onChange={(event) =>
                  update((c) => ({
                    ...c,
                    margins: { ...c.margins, vertical: Number(event.target.value) },
                  }))
                }
              >
                {MARGIN_OPTIONS.map((margin) => (
                  <option key={margin} value={margin}>
                    {margin} mm
                  </option>
                ))}
              </Select>
            </div>
            <Select
              label="Question numbering"
              value={config.numbering.style}
              onChange={(event) =>
                update((c) => ({
                  ...c,
                  numbering: {
                    ...c.numbering,
                    style: event.target.value as TemplateConfig["numbering"]["style"],
                  },
                }))
              }
            >
              {NUMBERING_STYLES.map((style) => (
                <option key={style} value={style}>
                  {NUMBERING_LABELS[style]}
                </option>
              ))}
            </Select>
            <Toggle
              label="Page numbers in footer"
              checked={config.footer.showPageNumbers}
              onChange={(showPageNumbers) =>
                update((c) => ({ ...c, footer: { ...c.footer, showPageNumbers } }))
              }
            />
            <Input
              label="Fixed footer text"
              hint="Optional text shown on every page, e.g. 'Answer on this paper'"
              value={config.footer.fixedText}
              onChange={(event) =>
                update((c) => ({ ...c, footer: { ...c.footer, fixedText: event.target.value } }))
              }
            />
          </Section>

          <Section
            title="Exam title block"
            description="Choose which fields appear in the table at the top of every exam."
          >
            <div className="grid grid-cols-2 gap-2">
              {TITLE_BLOCK_FIELDS.map((field) => (
                <label
                  key={field}
                  className="flex items-center gap-2.5 text-sm text-neutral-800"
                >
                  <input
                    type="checkbox"
                    checked={config.titleBlock.fields.includes(field)}
                    onChange={() => toggleTitleField(field)}
                    className="h-4 w-4 rounded border-neutral-300 accent-primary-600"
                  />
                  {TITLE_BLOCK_FIELD_LABELS[field]}
                </label>
              ))}
            </div>
          </Section>
        </div>

        <div className={tab === "preview" ? "" : "hidden lg:block"}>
          <p className="mb-2 text-sm font-medium text-neutral-600">Live preview</p>
          <ExamPreview config={config} exam={sampleExam} />
        </div>
      </div>
    </div>
  );
}