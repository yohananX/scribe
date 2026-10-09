import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { TemplateEditor } from "@/components/template/TemplateEditor";
import { createClient } from "@/lib/supabase/server";
import { getCachedProfile } from "@/lib/profile";
import { normalizeTemplateConfig, type TemplateConfig } from "@/lib/template";

const getOrgName = unstable_cache(
  async (orgId: string) => {
    const supabase = await createClient();
    const { data } = await supabase.from("organisations").select("name").eq("id", orgId).single();
    return data?.name ?? "";
  },
  ["org-name"],
  { tags: ["organisation"], revalidate: 300 }
);

const getTemplateForOrg = unstable_cache(
  async (orgId: string) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("templates")
      .select("config")
      .eq("organisation_id", orgId)
      .maybeSingle();
    return data;
  },
  ["org-template"],
  { tags: ["templates"], revalidate: 300 }
);

export default async function TemplatePage() {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getCachedProfile(session.user.id);

  if (!profile?.organisation_id || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const orgId = profile.organisation_id;

  const [orgName, template] = await Promise.all([
    getOrgName(orgId),
    getTemplateForOrg(orgId),
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