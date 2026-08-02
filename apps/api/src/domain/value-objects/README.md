# value-objects

Objetos de valor imutáveis, genéricos o suficiente para qualquer módulo de negócio reutilizar — não pertencem a nenhum bounded context específico (ver docs/architecture/decisions/0010).

- `ConfidenceScore` — score normalizado em [0, 1] com classificação (ALTA/MEDIA/BAIXA).
- `Evidence<T>` — estrutura usada por toda consulta a uma fonte de dados (interna ou externa), diferenciando encontrado/não encontrado/não consultado/erro de consulta como uma union discriminada. Ver ADR 0014.

CPF/CNPJ (específicos do domínio de Pessoa/Empresa) vivem em `modules/party/domain/value-objects`, não aqui — só o que é verdadeiramente transversal fica no shared kernel.
