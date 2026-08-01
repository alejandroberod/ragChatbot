import DOMMatrixPolyfill from "@thednp/dommatrix"

// pdf-parse (via pdfjs-dist) expects a browser-like environment and tries to
// polyfill DOMMatrix itself using @napi-rs/canvas's native binary. On Vercel
// that native binary isn't reliably included in the serverless bundle, so the
// require silently fails and pdfjs crashes with "DOMMatrix is not defined".
// Setting it ourselves with a pure-JS shim avoids depending on that native
// module entirely (text extraction only needs the matrix math, not real
// canvas rendering).
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = DOMMatrixPolyfill as unknown as typeof DOMMatrix
}
