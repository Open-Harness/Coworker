import { useCallback, useState } from "react";
import { Load, useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { ScreenProps } from "../types.ts";
import { after } from "./after.ts";
import { GeneralScreen } from "./GeneralScreen.tsx";

export function GeneralPage({ api, workspaceId, onGone }: ScreenProps & { readonly onGone: () => void }) {
  const { goTo } = useBrowser();
  const [logoVersion, setLogoVersion] = useState(0);
  const { loaded, reload } = useLoading(useCallback(() => api.general(workspaceId), [api, workspaceId]));
  const changedLogo = () => {
    setLogoVersion((version) => version + 1);
    reload();
  };
  return (
    <Load loaded={loaded} failedTitle="General did not load" onRetry={reload}>
      {(general) => (
        <GeneralScreen
          general={general}
          logoSrc={general.hasLogo ? api.logoUrl(workspaceId, logoVersion) : undefined}
          exportHref={api.exportUrl(workspaceId)}
          onSave={(input) => after(api.saveGeneral(workspaceId, input), reload)}
          onLogo={(file) => after(api.uploadLogo(workspaceId, file), changedLogo)}
          onRemoveLogo={() => after(api.removeLogo(workspaceId), changedLogo)}
          onDelete={() => after(api.removeWorkspace(workspaceId), onGone)}
          onDownload={goTo}
        />
      )}
    </Load>
  );
}
