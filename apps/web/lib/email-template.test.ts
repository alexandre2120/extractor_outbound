import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  renderOutboundEmailHtml,
  renderOutboundEmailText,
} from "./email-template";

describe("outbound email template", () => {
  it("renders a complete Brevo-ready HTML email from a plain text body", () => {
    const html = renderOutboundEmailHtml({
      subject: "Proposta <urgente>",
      body: "Olá equipa,\n\nPrimeira linha.\nSegunda linha.",
    });

    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /Proposta &lt;urgente&gt;/);
    assert.match(html, /data-template="outbound-email"/);
    assert.match(html, /role="presentation"/);
    assert.match(html, /Primeira linha\.<br \/>Segunda linha\./);
  });

  it("escapes user and AI generated content before inserting it into HTML", () => {
    const html = renderOutboundEmailHtml({
      subject: "Assunto",
      body: "<script>alert('x')</script> & follow-up",
    });

    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt; &amp; follow-up/);
  });

  it("keeps the plain text fallback readable", () => {
    assert.equal(
      renderOutboundEmailText("  Olá,\r\n\r\nVamos conversar?  "),
      "Olá,\n\nVamos conversar?",
    );
  });
});
