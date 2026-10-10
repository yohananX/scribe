import { redirect } from "next/navigation";
import { cache } from "react";
import { TemplateEditor } from "@/components/template/TemplateEditor";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { normalizeTemplateConfig, type TemplateConfig } from "@/lib/template";

const getOrgName = cache(
  async (supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) => {
    const { data } = await supabase.from("organisations").select("name").eq("id", orgId).single();
    return data?.name ?? "";
  }
);

const getTemplateForOrg = cache(
  async (supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) => {
    const { data } = await supabase
      .from("templates")
      .select("config")
      .eq("organisation_id", orgId)
      .maybeSingle();
    return data;
  }
);

export default async function TemplatePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile?.organisation_id || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const orgId = profile.organisation_id;

  const [orgName, template] = await Promise.all([
    getOrgName(supabase, orgId),
    getTemplateForOrg(supabase, orgId),
  ]);

  const config = normalizeTemplateConfig(template?.config);

  if (!config.schoolName.name) {
    config.schoolName = { ...config.schoolName, name: orgName };
  }

  if (config.logo?.path) {
    const { data: signed } = await supabase.storage
      .from("logos")
      .createSignedUrl(config.logo.path, 60 * 60 * 24);

    if (signed?.signedUrl) {
      config.logo = { ...config.logo, url: signed.signedUrl };
    }
  }

  const initialConfig: TemplateConfig = config;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <TemplateEditor initialConfig={initialConfig} orgId={orgId} />
    </div>
  );
}