// Ambient types for mammoth's browser build (no bundled types on this subpath).
// We use the browser entry so the bundler doesn't pull Node-only file APIs.
declare module "mammoth/mammoth.browser" {
  export interface ConvertResult {
    value: string;
    messages: { type: string; message: string }[];
  }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
}
