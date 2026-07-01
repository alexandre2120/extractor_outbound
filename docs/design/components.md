# Componentes

Biblioteca local em `packages/ui` (estilo shadcn/ui), consumida via `@repo/ui`.

## Disponíveis (Camada 1)

- `Button` — variantes: default, outline, ghost, subtle; tamanhos sm/default/lg.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`.
- `Badge` — variantes: default, outline, solid.
- `cn(...)` — merge de classes (clsx + tailwind-merge).

## Convenções

- Variantes via `class-variance-authority`.
- Cores apenas via tokens (`bg-surface`, `text-muted-foreground`, etc.).
- Sem cor saturada; foco com `ring`.

## A adicionar (Camada 2)

Input, Select, Table, Dialog, Tabs, Toast — seguindo os mesmos tokens.
