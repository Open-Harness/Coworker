import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";

type RouterLinkProps = Omit<ComponentProps<typeof Link>, "to"> & { readonly href?: string };

/** Astryx links as router links: addresses on this server change the page without loading it again. */
export function RouterLink({ href = "", ...rest }: RouterLinkProps) {
  const [path = "", query = ""] = href.split("?");
  const search: Record<string, unknown> = Object.fromEntries(new URLSearchParams(query));
  return <Link {...rest} to={path} search={search as never} />;
}
