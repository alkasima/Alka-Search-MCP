# Demo request

Find the official TypeScript documentation. Read its TypeScript Tooling in 5 Minutes guide and summarize the installation and first compilation steps with source links.

# Demo result

The official [TypeScript documentation](https://www.typescriptlang.org/docs/) includes a [TypeScript Tooling in 5 Minutes guide](https://www.typescriptlang.org/docs/handbook/typescript-tooling-in-5-minutes.html). I read that guide and found these steps:

| Step | What the guide shows |
| --- | --- |
| Install | For npm users, install the compiler with `npm install -g typescript`. |
| Create a source file | Save a small greeting function in `greeter.ts`. |
| Compile | Run `tsc greeter.ts` to generate `greeter.js`. |
| Add a type | Annotate the function parameter as `person: string`. Passing a number array then produces a type error. |

The guide explains that TypeScript checks the structure of the code and its type annotations. Its example also notes that JavaScript can still be emitted when type errors are reported, so inspect compiler diagnostics before using the output.

Source: [TypeScript Tooling in 5 Minutes](https://www.typescriptlang.org/docs/handbook/typescript-tooling-in-5-minutes.html).

Retrieval note: DuckDuckGo supplied search results in this run; Mojeek and Brave reported blocks. The official guide was fetched successfully. These commands summarize the guide; no packages were installed and no tutorial code was executed as part of this research.

# Verification

Prepared from a live Alka Search MCP search and page retrieval on October 18, 2026. This is the complete concise answer for the demo request, not a transcript of raw tool output. Provider availability can change.
