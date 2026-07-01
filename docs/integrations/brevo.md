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

## Regras

- Só envia mensagem revisada/aprovada por humano.
- Sem chave configurada, outbound fica desabilitado (`hasIntegration`).
- Registrar `providerId` no `DeliveryEvent` para reconciliação.
