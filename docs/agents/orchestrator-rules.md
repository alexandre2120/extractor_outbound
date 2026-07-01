# Regras do orquestrador

Execução por microagentes (Claude Code ou similar), coordenados por contratos,
documentação e artefatos de status.

## Regra de inicialização (Docs Guardian)

Antes de iniciar qualquer agente, validar:

1. existe documentação do módulo;
2. existe contrato de entrada/saída;
3. existe checklist de aceite;
4. existe contexto de dependências;
5. a ação exige leitura de `.env`/compose/schema/docs complementares?

Se qualquer item falhar → **interromper** e abrir tarefa de documentação pendente.

## Regras gerais

- Cada agente executa uma frente específica.
- Cada agente lê a documentação relevante antes de agir.
- Cada agente registra saída em documento/artefato rastreável.
- Nenhum agente altera env/contratos globais sem atualizar a documentação.
- Todo agente escreve: o que fez, do que depende, o que bloqueia o próximo.

## Implementação

- Contratos tipados em `packages/agents` (`AGENT_CONTRACTS`).
- `checkDocsPrerequisite()` bloqueia execução sem docs.
- Status persistido em `tracking/*.json` e refletido em `tracking/index.html`.
