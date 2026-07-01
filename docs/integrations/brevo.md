# Integração — Brevo (outbound)

Envio de e-mails, personalização por destinatário e tracking de eventos.

## Capacidades usadas

- Envio transacional / campanhas via API REST.
- Personalização por destinatário.
- Webhooks de eventos: delivered, opened, clicked, bounced, replied.

## Mapeamento

- Envio de `GeneratedMessage` (status APPROVED) → Brevo.
- Eventos do webhook → `DeliveryEvent` (`DeliveryEventType`).

## Variáveis

`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`.

## Webhook de eventos

Endpoint: `POST /api/webhooks/brevo` (route handler, runtime Node).

- Configure a URL no painel Brevo (Transactional → Settings → Webhook). Se
  `BREVO_WEBHOOK_SECRET` estiver setado, use `?secret=...` na URL.
- Aceita evento único ou array. Mapeia `event` → `DeliveryEventType`:
  `delivered→DELIVERED`, `opened/unique_opened→OPENED`, `click→CLICKED`,
  `hard_bounce/soft_bounce/blocked/invalid_email→BOUNCED`,
  `spam/deferred/error→FAILED`, `request→QUEUED`.
- Casa o `message-id` do evento com o `providerId` gravado no envio para achar a
  `GeneratedMessage` e criar o `DeliveryEvent`. Sem match → `unmatched` (ack 200).
- **Reply não é coberto** por webhook transacional (respostas exigem parsing de
  e-mail inbound — fora de escopo por ora).

## Regras

- Só envia mensagem revisada/aprovada por humano.
- Sem chave configurada, outbound fica desabilitado (`hasIntegration`).
- Registrar `providerId` no `DeliveryEvent` para reconciliação com o webhook.
