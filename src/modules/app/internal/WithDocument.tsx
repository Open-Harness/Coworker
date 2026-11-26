import type { ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { Layout } from "@astryxdesign/core/Layout";
import { useToast } from "@astryxdesign/core/Toast";
import { useClipboard, useMediaQuery } from "@astryxdesign/core/hooks";
import { DocumentDialog, DocumentPanel } from "~/modules/ui/service.ts";
import type { DocumentRow } from "~/modules/protocol/types.ts";
import type { WorkspaceClient } from "~/modules/manager-client/types.ts";
import type { DocumentSearch } from "../types.ts";
import { useDocument } from "./hooks.ts";
import { usePage } from "./page-context.ts";

const NARROW = "(max-width: 900px)";

interface OpenDocumentProps {
  readonly client: WorkspaceClient;
  readonly row: DocumentRow;
  readonly version: number | undefined;
  readonly address: string;
  readonly isNarrow: boolean;
}

function OpenDocument({ client, row, version, address, isNarrow }: OpenDocumentProps) {
  const { dependencies } = usePage();
  const router = useRouter();
  const showToast = useToast();
  const { copy } = useClipboard();
  const loaded = useDocument(client, row.id, version, row.version);
  const of = (shown: number) => `${address}?doc=${encodeURIComponent(row.id)}${shown === row.version ? "" : `&v=${shown}`}`;
  const share = async () => {
    const isCopied = await copy(dependencies.shareUrl(of(version ?? row.version)));
    showToast({ body: isCopied ? "Link copied" : "The browser did not allow copying", uniqueID: "share" });
  };
  const View = isNarrow ? DocumentDialog : DocumentPanel;
  return (
    <View
      row={row}
      {...loaded}
      onVersion={(next) => router.history.replace(of(next))}
      onShare={() => void share()}
      onClose={() => router.history.replace(address)}
    />
  );
}

interface WithDocumentProps {
  readonly client: WorkspaceClient;
  readonly search: DocumentSearch;
  /** The screen's own address, without a document. */
  readonly address: string;
  readonly header?: ReactNode;
  readonly content: ReactNode;
}

/** A screen with the document its address names, beside it or over it. */
export function WithDocument({ client, search, address, header, content }: WithDocumentProps) {
  const isNarrow = useMediaQuery(NARROW);
  const documents = useSelector(client.state, ({ workspace }) => workspace?.documents);
  const row = documents?.find(({ id }) => id === search.doc);
  const document = row && <OpenDocument key={row.id} client={client} row={row} version={search.v} address={address} isNarrow={isNarrow} />;
  return (
    <>
      <Layout height="fill" header={header} content={content} {...(document && !isNarrow ? { end: document } : {})} />
      {isNarrow && document}
    </>
  );
}
