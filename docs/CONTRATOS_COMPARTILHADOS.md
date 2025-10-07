# Fluxo para contratos compartilhados

Este guia explica como criar e manter contratos (DTOs, interfaces e tipos utilitários) compartilhados no monorepositório.

## Estrutura oficial

Todos os contratos vivem em [`packages/types`](../packages/types). O ponto de entrada exporta automaticamente os módulos presentes em `src/contracts`, `src/dto`, `src/enums` e `src/utils`. Ao criar um novo contrato, mantenha a estrutura existente e lembre-se de atualizar os `index.ts` relevantes para expor o artefato pelo pacote `@repo/types`.

## Criação ou atualização de contratos

1. **Escolha o local correto** – novos DTOs ou interfaces devem ficar dentro de `packages/types/src`, seguindo o agrupamento atual (`dto`, `contracts`, `enums`, `utils`).
2. **Implemente o contrato** – crie ou edite o arquivo TypeScript necessário.
3. **Atualize os agregadores** – exporte o novo contrato no `index.ts` da pasta e, se necessário, no `src/index.ts`.
4. **Valide localmente** – execute `pnpm lint` e `pnpm check-types` a partir da raiz para garantir que os contratos estejam corretos e que os consumidores continuem compilando.
5. **Atualize consumidores** – importe o contrato usando o alias `@repo/types` (por exemplo, `import { UserDTO } from "@repo/types";`).

> ⚠️ O ESLint está configurado para alertar sempre que interfaces/DTOs forem declarados fora de `packages/types` ou quando um import relativo for utilizado para consumir contratos compartilhados. Corrija o código movendo a declaração para `packages/types` e importando via `@repo/types`.

## Processo de revisão

1. Abra um Pull Request descrevendo as mudanças de contrato e os impactos esperados nas aplicações.
2. Marque as squads impactadas e solicite revisão de pelo menos um mantenedor de `packages/types`.
3. Garanta que os contratos possuam versionamento semântico na documentação ou changelog relevante, quando aplicável.
4. Antes do merge, confirme novamente que `pnpm lint` e `pnpm check-types` passam com sucesso no CI.

Seguir este fluxo garante que todos os serviços utilizem contratos unificados e evita divergências entre implementações.
