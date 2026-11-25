import { configure } from "@testing-library/react";

/** How long a page test waits for what it expects to appear. The default second is too short on a busy machine. */
configure({ asyncUtilTimeout: 10_000 });
