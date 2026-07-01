# Checklist de aceite (por módulo)

Um módulo só é "pronto" quando:

- [ ] existe documentação do módulo;
- [ ] existe contrato de dados;
- [ ] existe critério de aceite;
- [ ] existe evidência de execução local;
- [ ] status refletido na página de acompanhamento;
- [ ] dependências declaradas;
- [ ] variáveis de ambiente documentadas.

## Checklist de execução (Camada 1)

1. [x] Repositório com estrutura modular.
2. [x] Next.js App Router base.
3. [x] PostgreSQL e Redis em Docker Compose.
4. [x] Pacote de configuração compartilhada (`@repo/config`).
5. [x] Schema inicial do domínio.
6. [x] `/docs` com documentação mínima.
7. [x] Contratos do orquestrador e dos microagentes.
8. [x] Página HTML de progresso.
9. [x] Adapters de provider (contrato definido).
10. [ ] Fluxo `Company → ResearchJob → AIEnrichment → Message` (Camada 2).
11. [ ] Integrar Brevo e KIE (Camada 2).
