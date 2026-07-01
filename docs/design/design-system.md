# Design system

Estética minimalista: preto, branco e cinza. Fundo claro acinzentado (não branco
puro). Sem cores saturadas, sem gradientes, sem "AI slop".

## Tokens (`apps/web/app/globals.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--background` | `#f4f4f5` | fundo da página (cinza muito claro) |
| `--surface` | `#fbfbfc` | cards/superfícies (branco acinzentado) |
| `--surface-muted` | `#ededf0` | superfícies secundárias (cinza claro) |
| `--border` | `#e0e0e3` | bordas (cinza neutro) |
| `--ring` | `#9b9ba1` | foco |
| `--text-primary` | `#1c1c1f` | texto (preto suave) |
| `--text-secondary` | `#6b6b72` | texto secundário (cinza médio) |
| `--accent` | `#1c1c1f` | acento (preto, sem saturação) |

## Princípios

- Mais branco do que preto; preto como contraste, não fundo dominante.
- Tipografia simples, discreta, altamente legível.
- Bordas suaves, baixo contraste decorativo.
- Componentes inspirados em shadcn/ui (`packages/ui`).
