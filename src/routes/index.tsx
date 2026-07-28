import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.session.user.id)
      .maybeSingle();

    if (!profile?.onboarded) throw redirect({ to: "/onboarding" });
    throw redirect({ to: "/home" });
  },
  component: () => null,
});
