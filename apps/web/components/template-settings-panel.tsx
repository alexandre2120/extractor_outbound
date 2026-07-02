import { Field, Input, Textarea } from "@repo/ui";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { SectionCard, SectionTitle, StatusPill } from "@/components/flow-ui";
import {
  approveTemplateSettingsAction,
  generateTemplateSettingsFromWebsiteAction,
  saveTemplateSettingsDraftAction,
} from "@/lib/actions";
import { renderOutboundEmailHtml } from "@/lib/email-template";

type TemplateSettingsPanelRecord = {
  id: string;
  status: string;
  isActive: boolean;
  websiteUrl: string | null;
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  fontFamily: string | null;
  senderName: string | null;
  senderRole: string | null;
  signature: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  offerSummary: string | null;
  valueProposition: string | null;
  tone: string | null;
};

export function TemplateSettingsPanel({
  planId,
  currentOffer,
  draft,
  approved,
}: {
  planId: string;
  currentOffer: string | null;
  draft: TemplateSettingsPanelRecord | null;
  approved: TemplateSettingsPanelRecord | null;
}) {
  const settings = draft ?? approved;
  const offerSuggestion = settings?.offerSummary?.trim() ?? "";
  const hasCurrentOffer = !!currentOffer?.trim();
  const showApplyOffer = offerSuggestion.length > 0 && !hasCurrentOffer;
  const previewHtml = renderOutboundEmailHtml({
    subject: "Preview do template",
    body: [
      "Olá,",
      "",
      "Esta é uma prévia visual do email outbound usando o rascunho atual ou o template aprovado.",
    ].join("\n"),
    settings,
  });

  return (
    <SectionCard id="branding-template">
      <SectionTitle
        title="Branding e template"
        description="Gere pelo site, revise os campos e aprove antes de usar nos envios."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {approved ? (
              <StatusPill variant="solid">template aprovado</StatusPill>
            ) : (
              <StatusPill variant="outline">sem template aprovado</StatusPill>
            )}
            {draft ? (
              <StatusPill>rascunho pronto para revisão</StatusPill>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-5">
          <ActionForm
            action={generateTemplateSettingsFromWebsiteAction.bind(null, planId)}
            submitLabel="Gerar pelo site"
          >
            <Field label="Website da empresa">
              <Input
                name="websiteUrl"
                defaultValue={settings?.websiteUrl ?? ""}
                placeholder="https://suaempresa.com"
              />
            </Field>
          </ActionForm>

          <ActionForm
            action={saveTemplateSettingsDraftAction.bind(null, planId)}
            submitLabel="Salvar rascunho"
          >
            {draft ? (
              <input type="hidden" name="settingsId" value={draft.id} />
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome da marca">
                <Input
                  name="brandName"
                  defaultValue={settings?.brandName ?? ""}
                />
              </Field>
              <Field label="Logo URL">
                <Input name="logoUrl" defaultValue={settings?.logoUrl ?? ""} />
              </Field>
              <Field label="Cor primária">
                <Input
                  name="primaryColor"
                  defaultValue={settings?.primaryColor ?? ""}
                  placeholder="#111111"
                />
              </Field>
              <Field label="Cor de destaque">
                <Input
                  name="accentColor"
                  defaultValue={settings?.accentColor ?? ""}
                  placeholder="#4B5563"
                />
              </Field>
              <Field label="Cor de fundo">
                <Input
                  name="backgroundColor"
                  defaultValue={settings?.backgroundColor ?? ""}
                  placeholder="#F6F7F9"
                />
              </Field>
              <Field label="Fonte">
                <Input
                  name="fontFamily"
                  defaultValue={settings?.fontFamily ?? ""}
                  placeholder="Arial"
                />
              </Field>
              <Field label="Remetente">
                <Input
                  name="senderName"
                  defaultValue={settings?.senderName ?? ""}
                />
              </Field>
              <Field label="Cargo do remetente">
                <Input
                  name="senderRole"
                  defaultValue={settings?.senderRole ?? ""}
                />
              </Field>
              <Field label="CTA label">
                <Input
                  name="ctaLabel"
                  defaultValue={settings?.ctaLabel ?? ""}
                />
              </Field>
              <Field label="CTA URL">
                <Input name="ctaUrl" defaultValue={settings?.ctaUrl ?? ""} />
              </Field>
            </div>

            <Field label="Assinatura">
              <Textarea name="signature" defaultValue={settings?.signature ?? ""} />
            </Field>

            <Field label="Oferta resumida">
              <Textarea
                name="offerSummary"
                defaultValue={settings?.offerSummary ?? ""}
              />
            </Field>

            {showApplyOffer ? (
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="applyOffer"
                  className="mt-0.5 h-4 w-4 rounded border border-border"
                />
                <span>
                  Usar esta sugestão para preencher o campo de oferta do perfil.
                </span>
              </label>
            ) : offerSuggestion ? (
              <p className="text-xs text-muted-foreground">
                A oferta atual do perfil será mantida.
              </p>
            ) : null}

            <Field label="Proposta de valor">
              <Textarea
                name="valueProposition"
                defaultValue={settings?.valueProposition ?? ""}
              />
            </Field>

            <Field label="Tom">
              <Textarea name="tone" defaultValue={settings?.tone ?? ""} />
            </Field>
          </ActionForm>

          {draft ? (
            <div className="flex flex-wrap items-center gap-3">
              <ActionButton
                action={approveTemplateSettingsAction.bind(null, planId, draft.id)}
                label="Aprovar template"
                pendingLabel="Aprovando..."
              />
              <span className="text-xs text-muted-foreground">
                A aprovação ativa este template para previews e envios futuros.
              </span>
            </div>
          ) : null}
        </div>

        <section className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="border-b border-border/70 px-4 py-2 text-xs font-semibold text-muted-foreground">
            Preview HTML
          </div>
          <iframe
            title="Preview do template de outbound"
            srcDoc={previewHtml}
            sandbox=""
            referrerPolicy="no-referrer"
            className="h-[560px] w-full bg-white"
          />
        </section>
      </div>
    </SectionCard>
  );
}
