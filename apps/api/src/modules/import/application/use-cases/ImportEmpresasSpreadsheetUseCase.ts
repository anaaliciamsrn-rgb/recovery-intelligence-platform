import { ImportBatch, type ImportBatchCounts } from "../../domain/entities/ImportBatch.js";
import { ImportRowStatus } from "../../domain/value-objects/ImportRowStatus.js";
import type { IImportBatchRepository } from "../../domain/repositories/IImportBatchRepository.js";
import type { CreateCaseUseCase } from "../../../case-management/application/use-cases/CreateCaseUseCase.js";
import type { UpdateCaseDetailsUseCase } from "../../../case-management/application/use-cases/UpdateCaseDetailsUseCase.js";
import { CaseNote } from "../../../case-management/domain/entities/CaseNote.js";
import type { ICaseNoteRepository } from "../../../case-management/domain/repositories/ICaseNoteRepository.js";
import type { CasePriority } from "../../../case-management/domain/value-objects/CasePriority.js";
import type { CreateDossieUseCase } from "../../../dossie/application/use-cases/CreateDossieUseCase.js";
import type { RegistrarEvidenciaUseCase } from "../../../dossie/application/use-cases/RegistrarEvidenciaUseCase.js";
import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";
import { Empresa } from "../../../party/domain/entities/Empresa.js";
import { ParticipacaoSocietaria } from "../../../party/domain/entities/ParticipacaoSocietaria.js";
import { Pessoa } from "../../../party/domain/entities/Pessoa.js";
import { CNPJ } from "../../../party/domain/value-objects/CNPJ.js";
import { CPF } from "../../../party/domain/value-objects/CPF.js";
import type { IEmpresaRepository } from "../../../party/domain/repositories/IEmpresaRepository.js";
import type { IParticipacaoSocietariaRepository } from "../../../party/domain/repositories/IParticipacaoSocietariaRepository.js";
import type { IPessoaRepository } from "../../../party/domain/repositories/IPessoaRepository.js";
import type { RegisterTenantResourceUseCase } from "../../../tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import type { CreateVersionSnapshotUseCase } from "../../../dossier-versioning/application/use-cases/CreateVersionSnapshotUseCase.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { IEmpresaEvidenceSimulator } from "../ports/IEmpresaEvidenceSimulator.js";
import type { IEmpresaOwnershipSimulator } from "../ports/IEmpresaOwnershipSimulator.js";
import type {
  IEmpresaSpreadsheetParser,
  ParsedEmpresaRow,
} from "../ports/IEmpresaSpreadsheetParser.js";
import type { IReceitaFederalProvider } from "../ports/IReceitaFederalProvider.js";

const CONFIDENCE_RECEITA_FEDERAL_ENCONTRADO = 0.97;
const CONFIDENCE_RECEITA_FEDERAL_NAO_ENCONTRADO = 0.9;

const CLASSE_PARA_PRIORIDADE: Partial<Record<string, CasePriority>> = {
  ALTO_RISCO: "ALTA",
  MEDIO_RISCO: "MEDIA",
};

export interface ImportEmpresasSpreadsheetInput {
  fileBuffer: Buffer;
  nomeArquivo: string;
  tenantId: string;
  iniciadoPorUsuarioId: string | null;
}

export interface ImportEmpresasSpreadsheetOutput {
  importBatchId: string;
  totalLinhas: number;
  contagens: ImportBatchCounts;
  empresasProcessadas: number;
  dossiesCriados: number;
}

const FONTE_EMPRESAS = "EMPRESAS_CADASTRAIS";

const STATUS_PARA_CONTAGEM: Record<ImportRowStatus, keyof ImportBatchCounts> = {
  [ImportRowStatus.IMPORTADA]: "importadas",
  [ImportRowStatus.IGNORADA]: "ignoradas",
  [ImportRowStatus.INVALIDA]: "invalidas",
  [ImportRowStatus.DUPLICADA]: "duplicadas",
  [ImportRowStatus.ERRO]: "erros",
};

/**
 * Orquestra o pipeline completo da importação de carteira de clientes (ver
 * ADR 0037): parse da planilha → cadastro (find-or-create) da Empresa em
 * `party` → criação de Dossiê vazio em `dossie` → preenchimento de quatro
 * evidências via `IEmpresaEvidenceSimulator` (a "IA de demonstração",
 * nenhuma consulta externa real) e da quinta (Receita Federal) via
 * `IReceitaFederalProvider` — a única fonte com consulta externa real
 * (BrasilAPI, proxy público gratuito do cadastro real da Receita Federal,
 * ver ADR 0038). CNPJs fictícios (ex.: a planilha demo) legitimamente
 * voltam `NAO_ENCONTRADO` aqui — não é bug, é honestidade: dado fictício
 * não pode aparecer como encontrado numa fonte real. → snapshot versionado via
 * `CreateVersionSnapshotUseCase` (que já reexecuta classificação e
 * recomendação internamente — é o mesmo objeto que alimenta o dashboard
 * executivo, ver ADR 0022/0025) → registro de propriedade do lote e de cada
 * Dossiê criado ao tenant do chamador via `TenantResourceOwnership` (ADR
 * 0028/0037), nunca por um `X-Tenant-Id` de header.
 *
 * Uma linha que falha em qualquer etapa não interrompe as demais — mesmo
 * princípio de resiliência de `ImportPgfnSpreadsheetUseCase` (ADR 0019).
 *
 * **Limitação conhecida, documentada**: reimportar a mesma planilha cria
 * novos Dossiês para as mesmas Empresas (nenhuma deduplicação entre lotes,
 * diferente do fluxo PGFN) — aceitável para esta fase porque o fluxo
 * principal é "importar uma vez, ver o dashboard preenchido", não
 * reconciliação incremental de carteira.
 */
export class ImportEmpresasSpreadsheetUseCase {
  constructor(
    private readonly parser: IEmpresaSpreadsheetParser,
    private readonly importBatchRepository: IImportBatchRepository,
    private readonly empresaRepository: IEmpresaRepository,
    private readonly createDossieUseCase: CreateDossieUseCase,
    private readonly registrarEvidenciaUseCase: RegistrarEvidenciaUseCase,
    private readonly createVersionSnapshotUseCase: CreateVersionSnapshotUseCase,
    private readonly evidenceSimulator: IEmpresaEvidenceSimulator,
    private readonly registerTenantResourceUseCase: RegisterTenantResourceUseCase,
    private readonly pessoaRepository: IPessoaRepository,
    private readonly participacaoRepository: IParticipacaoSocietariaRepository,
    private readonly ownershipSimulator: IEmpresaOwnershipSimulator,
    private readonly createCaseUseCase: CreateCaseUseCase,
    private readonly updateCaseDetailsUseCase: UpdateCaseDetailsUseCase,
    private readonly caseNoteRepository: ICaseNoteRepository,
    private readonly receitaFederalProvider: IReceitaFederalProvider,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: ImportEmpresasSpreadsheetInput): Promise<ImportEmpresasSpreadsheetOutput> {
    const parsed = this.parser.parse(input.fileBuffer);
    const now = this.clock.now();

    const batch = ImportBatch.iniciar({
      id: this.idGenerator.generateId(),
      fonte: FONTE_EMPRESAS,
      nomeArquivo: input.nomeArquivo,
      totalLinhas: parsed.rows.length,
      now,
      iniciadoPorUsuarioId: input.iniciadoPorUsuarioId,
    });

    let dossiesCriados = 0;
    for (const row of parsed.rows) {
      const status = await this.processarLinha(
        row,
        input.tenantId,
        input.iniciadoPorUsuarioId,
        now,
      );
      batch.registrarContagem(STATUS_PARA_CONTAGEM[status]);
      if (status === ImportRowStatus.IMPORTADA) dossiesCriados += 1;
    }

    batch.finalizar(this.clock.now());
    await this.importBatchRepository.save(batch);
    await this.registerTenantResourceUseCase.execute({
      tenantId: input.tenantId,
      resourceType: "ImportBatch",
      resourceId: batch.id,
    });

    return {
      importBatchId: batch.id,
      totalLinhas: batch.totalLinhas,
      contagens: batch.contagens,
      empresasProcessadas: dossiesCriados,
      dossiesCriados,
    };
  }

  private async processarLinha(
    row: ParsedEmpresaRow,
    tenantId: string,
    usuarioId: string | null,
    now: Date,
  ): Promise<ImportRowStatus> {
    const todosOsCamposVazios =
      !row.cnpj && !row.razaoSocial && !row.nomeFantasia && !row.telefone && !row.email;
    if (todosOsCamposVazios) return ImportRowStatus.IGNORADA;

    if (!row.cnpj || !row.razaoSocial) return ImportRowStatus.INVALIDA;

    let cnpj: CNPJ;
    try {
      cnpj = CNPJ.create(row.cnpj);
    } catch {
      return ImportRowStatus.INVALIDA;
    }

    try {
      let empresa = await this.empresaRepository.findByCnpj(cnpj);
      if (!empresa) {
        empresa = Empresa.create({
          id: this.idGenerator.generateId(),
          cnpj,
          razaoSocial: row.razaoSocial,
          createdAt: now,
          updatedAt: now,
        });
        await this.empresaRepository.save(empresa);
      }

      const dossie = await this.createDossieUseCase.execute({
        subjectType: "EMPRESA",
        subjectId: empresa.id,
      });

      const evidencias = this.evidenceSimulator.simulate(cnpj.toString());
      for (const [fonte, evidencia] of Object.entries(evidencias) as [
        DossieFonte,
        (typeof evidencias)[DossieFonte],
      ][]) {
        if (fonte === "RECEITA_FEDERAL") continue;
        await this.registrarEvidenciaUseCase.execute({
          dossieId: dossie.id,
          fonte,
          status: evidencia.status,
          valor: evidencia.valor,
          confidenceScore: evidencia.confidenceScore,
          motivoErro: evidencia.motivoErro,
        });
      }

      await this.registrarReceitaFederalReal(dossie.id, cnpj.toString());

      const snapshot = await this.createVersionSnapshotUseCase.execute({
        dossieId: dossie.id,
        usuarioId,
      });

      await this.registerTenantResourceUseCase.execute({
        tenantId,
        resourceType: "Dossie",
        resourceId: dossie.id,
      });

      await this.gerarEstruturaSocietaria(cnpj.toString(), row.responsavel, empresa.id, now);
      await this.abrirCasoSeArriscado(dossie.id, snapshot.classificacao, usuarioId, now);

      return ImportRowStatus.IMPORTADA;
    } catch {
      return ImportRowStatus.ERRO;
    }
  }

  /**
   * Única evidência com consulta externa real (ver ADR 0038) — as outras
   * quatro continuam simuladas. `NAO_ENCONTRADO` para um CNPJ fictício é o
   * resultado correto, não um erro: a Receita Federal real não conhece
   * empresas que não existem.
   */
  private async registrarReceitaFederalReal(dossieId: string, cnpj: string): Promise<void> {
    const resultado = await this.receitaFederalProvider.consultar(cnpj);

    if (resultado.status === "ENCONTRADO") {
      await this.registrarEvidenciaUseCase.execute({
        dossieId,
        fonte: "RECEITA_FEDERAL",
        status: "ENCONTRADO",
        valor: resultado.valor,
        confidenceScore: CONFIDENCE_RECEITA_FEDERAL_ENCONTRADO,
        motivoErro: null,
      });
      return;
    }

    if (resultado.status === "NAO_ENCONTRADO") {
      await this.registrarEvidenciaUseCase.execute({
        dossieId,
        fonte: "RECEITA_FEDERAL",
        status: "NAO_ENCONTRADO",
        valor: null,
        confidenceScore: CONFIDENCE_RECEITA_FEDERAL_NAO_ENCONTRADO,
        motivoErro: null,
      });
      return;
    }

    await this.registrarEvidenciaUseCase.execute({
      dossieId,
      fonte: "RECEITA_FEDERAL",
      status: "ERRO_CONSULTA",
      valor: null,
      confidenceScore: null,
      motivoErro: resultado.motivoErro,
    });
  }

  /**
   * Sócios/administradores fictícios (ver ADR 0037) — `Pessoa`/
   * `ParticipacaoSocietaria` são dados de referência globais (mesmo padrão
   * de `Empresa`, ADR 0011/0012), nunca tenant-scoped: é o que alimenta o
   * Grafo de Relacionamento com dados reais em vez de "nenhum vínculo
   * encontrado".
   */
  private async gerarEstruturaSocietaria(
    cnpj: string,
    responsavel: string | null,
    empresaId: string,
    now: Date,
  ): Promise<void> {
    const socios = this.ownershipSimulator.simulate(cnpj, responsavel);

    for (const socio of socios) {
      let cpf: CPF;
      try {
        cpf = CPF.create(socio.cpf);
      } catch {
        continue;
      }

      let pessoa = await this.pessoaRepository.findByCpf(cpf);
      if (!pessoa) {
        pessoa = Pessoa.create({
          id: this.idGenerator.generateId(),
          cpf,
          nome: socio.nome,
          createdAt: now,
          updatedAt: now,
        });
        await this.pessoaRepository.save(pessoa);
      }

      const participacao = ParticipacaoSocietaria.create({
        id: this.idGenerator.generateId(),
        pessoaId: pessoa.id,
        empresaId,
        papel: socio.papel,
        percentualParticipacao: socio.percentualParticipacao,
        dataEntrada: now,
        dataSaida: null,
        createdAt: now,
        updatedAt: now,
      });
      await this.participacaoRepository.save(participacao);
    }
  }

  /**
   * Triagem automática (ver ADR 0037): toda Empresa que sair da importação
   * como MEDIO_RISCO/ALTO_RISCO já nasce com um Case aberto — nunca para
   * BAIXO_RISCO (uma carteira saudável não deveria acender alerta nenhum).
   * `autorId: null` na nota marca explicitamente que foi o sistema, não uma
   * pessoa, que abriu o caso.
   */
  private async abrirCasoSeArriscado(
    dossieId: string,
    classificacao: string,
    usuarioId: string | null,
    now: Date,
  ): Promise<void> {
    const priority = CLASSE_PARA_PRIORIDADE[classificacao];
    if (!priority) return;

    const caso = await this.createCaseUseCase.execute({
      dossieId,
      ownerId: null,
      priority,
      autorId: usuarioId,
    });

    await this.updateCaseDetailsUseCase.execute({
      caseId: caso.id,
      autorId: usuarioId,
      tags: ["triagem-automatica-ia", classificacao.toLowerCase().replaceAll("_", "-")],
      proximaAcao: "Revisar classificação de risco e iniciar contato com a empresa",
    });

    await this.caseNoteRepository.save(
      CaseNote.create({
        id: this.idGenerator.generateId(),
        caseId: caso.id,
        autorId: null,
        texto: `Caso aberto automaticamente pela triagem de risco (IA de demonstração) durante a importação — classificação: ${classificacao}.`,
        createdAt: now,
      }),
    );
  }
}
