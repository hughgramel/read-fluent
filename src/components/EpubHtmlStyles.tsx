export function EpubHtmlStyles() {
  return (
    <style jsx global>{`
      .epub-html { font-size: 1em; }
      .epub-html *, .epub-html *:before, .epub-html *:after {
        max-width: 100%;
        box-sizing: border-box;
      }
      .epub-html img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1em auto;
        position: static !important;
      }
      .epub-html *[style*='position:fixed'],
      .epub-html *[style*='position:absolute'] {
        position: static !important;
      }
      .epub-html p { margin: 1em 0; font-size: 1em; }
      .epub-html a { color: #2563eb; text-decoration: underline; }
      .epub-html sup, .epub-html sub, .epub-html .footnote, .epub-html .footnotes { font-size: 0.75em; }
      .epub-html table { border-collapse: collapse; width: 100%; }
      .epub-html th, .epub-html td { border: 1px solid #ccc; padding: 0.3em 0.6em; }
      .epub-html blockquote { border-left: 4px solid #ccc; margin: 1em 0; padding: 0.5em 1em; color: #555; background: #fafafa; }
      .epub-html ul, .epub-html ol { margin: 1em 0 1em 2em; }
      .epub-html li { margin: 0.3em 0; }
      .epub-html .sentence-span.sentence-hovered, .speaking-highlight {
        background: rgba(255, 255, 0, 0.18) !important;
        border-radius: 0.25em;
        transition: background 0.15s;
        box-shadow: 0 -4px 0 0 rgba(255, 255, 0, 0.18);
      }
      .speaking-highlight-word {
        background-color: rgba(255, 200, 0, 0.5);
        border-radius: 0.25em;
        transition: background-color 0.2s;
        box-shadow: 0 -8px 0 0 rgba(255, 200, 0, 0.5);
      }
      .sentence-selectable:hover {
        background-color: rgba(0, 123, 255, 0.2);
      }
    `}</style>
  );
} 