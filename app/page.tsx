import CelebrationBoard from "@/components/celebration-board";
import { appConfig, hasCommentsIntegrationConfig, hasGoogleDriveOauthConfig } from "@/lib/google-client";
import { listComments } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const commentsReady = hasCommentsIntegrationConfig();
  const driveOauthReady = hasGoogleDriveOauthConfig();
  const comments = commentsReady ? await listComments() : [];

  return (
    <CelebrationBoard
      initialComments={comments}
      commentsReady={commentsReady}
      driveOauthReady={driveOauthReady}
      driveFolderId={driveOauthReady ? appConfig.driveFolderId : ""}
      maxUploadFiles={appConfig.maxUploadFiles}
      maxUploadFileSizeMb={appConfig.maxUploadFileSizeMb}
    />
  );
}