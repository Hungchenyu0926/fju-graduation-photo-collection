import CelebrationBoard from "@/components/celebration-board";
import { hasGoogleIntegrationConfig } from "@/lib/google-client";
import { listComments } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const setupPending = !hasGoogleIntegrationConfig();
  const comments = setupPending ? [] : await listComments();

  return <CelebrationBoard initialComments={comments} setupPending={setupPending} />;
}