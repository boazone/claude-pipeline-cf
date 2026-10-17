import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library unmounts after each test by itself only under Vitest's `globals`, which we do not use.
afterEach(cleanup);
