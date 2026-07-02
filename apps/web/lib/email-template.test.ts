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

  it("renders approved branding settings when provided", () => {
    const html = renderOutboundEmailHtml({
      subject: "Olá",
      body: "Mensagem principal.",
      settings: {
        brandName: "Acme",
        logoUrl: "https://cdn.example.com/logo.png",
        primaryColor: "#123456",
        backgroundColor: "#F5F7FA",
        fontFamily: "Inter",
        signature: "Equipe Acme",
        ctaLabel: "Ver diagnóstico",
        ctaUrl: "https://example.com/demo",
      },
    });

    assert.match(html, /https:\/\/cdn\.example\.com\/logo\.png/);
    assert.match(html, /#123456/);
    assert.match(html, /#F5F7FA/);
    assert.match(html, /Equipe Acme/);
    assert.match(html, /Ver diagnóstico/);
    assert.match(html, /https:\/\/example\.com\/demo/);
  });

  it("ignores unsafe branding URLs and escapes settings text", () => {
    const html = renderOutboundEmailHtml({
      subject: "Olá",
      body: "Corpo",
      settings: {
        logoUrl: "javascript:alert(1)",
        ctaUrl: "http://example.com",
        signature: "<strong>Assinatura</strong>",
      },
    });

    assert.doesNotMatch(html, /javascript:alert/);
    assert.doesNotMatch(html, /http:\/\/example\.com/);
    assert.match(html, /&lt;strong&gt;Assinatura&lt;\/strong&gt;/);
  });

  it("keeps the plain text fallback readable", () => {
    assert.equal(
      renderOutboundEmailText("  Olá,\r\n\r\nVamos conversar?  "),
      "Olá,\n\nVamos conversar?",
    );
  });
});
