import CelebrationBoard from "@/components/celebration-board";
import { listComments } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const comments = await listComments();

  return <CelebrationBoard initialComments={comments} />;
}
