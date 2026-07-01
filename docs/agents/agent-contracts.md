# Contratos de microagentes

Definição canônica e tipada: `packages/agents/src/index.ts` (`AGENT_CONTRACTS`).
Cada contrato declara `requiresDocs`, `producesDocs`, `inputs`, `outputs`,
`acceptance`, `dependsOn`.

| Agente | Frente | Depende de |
| --- | --- | --- |
| foundation | repo, tooling, bootstrap | — |
| docker-infra | compose, env, healthchecks | foundation |
| database | schema, migrations, seed | foundation, domain-modeling |
| domain-modeling | entidades, fluxos, estados | — |
| data-providers | adapters CNPJ/PT/EU | database |
| browser-research | jobs de navegador, evidências | database |
| ai-gateway | KIE, prompts, saída estruturada | browser-research |
| outbound-messaging | Brevo, sequências, eventos | ai-gateway |
| frontend-ui | design system, páginas | foundation |
| progress-tracker | página HTML de status | — |
| docs-guardian | bloqueio sem documentação | — |

## Saída obrigatória de cada agente

Atualizar o `tracking/tasks/<agente>.json` correspondente (status, o que depende,
o que bloqueia) e qualquer doc que produziu.
