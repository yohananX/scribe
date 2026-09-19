import { redirect } from "next/navigation";
import { TemplateEditor } from "@/components/template/TemplateEditor";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { normalizeTemplateConfig, type TemplateConfig } from "@/lib/template";

export default async function TemplatePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile?.organisation_id || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: organisation } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", profile.organisation_id)
    .single();

  const { data: template } = await supabase
    .from("templates")
    .select("config")
    .eq("organisation_id", profile.organisation_id)
    .maybeSingle();

  const config = normalizeTemplateConfig(template?.config);

  if (!config.schoolName.name) {
    config.schoolName = { ...config.schoolName, name: organisation?.name ?? "" };
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
      <TemplateEditor initialConfig={initialConfig} orgId={profile.organisation_id} />
    </div>
  );
}