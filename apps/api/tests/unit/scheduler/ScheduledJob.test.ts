import {
  InvalidJobTransitionError,
  InvalidScheduledJobError,
  ScheduledJob,
} from "../../../src/modules/scheduler/domain/entities/ScheduledJob.js";
import { ScheduledJobStatus } from "../../../src/modules/scheduler/domain/value-objects/ScheduledJobStatus.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildJob(overrides: Partial<Parameters<typeof ScheduledJob.agendar>[0]> = {}) {
  return ScheduledJob.agendar({
    id: "job-1",
    nome: "Lembrete de follow-up",
    tipo: "case.followup-reminder",
    payload: { caseId: "case-1" },
    status: ScheduledJobStatus.PENDENTE,
    agendadoPara: NOW,
    tentativas: 0,
    maxTentativas: 3,
    ultimoErro: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });
}

describe("ScheduledJob", () => {
  it("agenda um job válido como PENDENTE", () => {
    const job = buildJob();
    expect(job.status).toBe(ScheduledJobStatus.PENDENTE);
    expect(job.tentativas).toBe(0);
  });

  it("rejeita nome vazio", () => {
    expect(() => buildJob({ nome: "  " })).toThrow(InvalidScheduledJobError);
  });

  it("rejeita tipo vazio", () => {
    expect(() => buildJob({ tipo: "" })).toThrow(InvalidScheduledJobError);
  });

  it("rejeita maxTentativas menor que 1", () => {
    expect(() => buildJob({ maxTentativas: 0 })).toThrow(InvalidScheduledJobError);
  });

  it("iniciarExecucao() só é permitido a partir de PENDENTE", () => {
    const job = buildJob({ status: ScheduledJobStatus.EXECUTANDO });
    expect(() => job.iniciarExecucao(NOW)).toThrow(InvalidJobTransitionError);
  });

  it("concluir() transiciona EXECUTANDO -> CONCLUIDO e limpa ultimoErro", () => {
    const job = buildJob({ ultimoErro: "erro anterior" });
    job.iniciarExecucao(NOW);
    const fim = new Date("2026-01-01T00:00:05Z");

    job.concluir(fim);

    expect(job.status).toBe(ScheduledJobStatus.CONCLUIDO);
    expect(job.ultimoErro).toBeNull();
    expect(job.updatedAt).toEqual(fim);
  });

  it("concluir() só é permitido a partir de EXECUTANDO", () => {
    const job = buildJob();
    expect(() => job.concluir(NOW)).toThrow(InvalidJobTransitionError);
  });

  it("falhar() com proximaTentativa reagenda como PENDENTE e incrementa tentativas", () => {
    const job = buildJob();
    job.iniciarExecucao(NOW);
    const proxima = new Date("2026-01-01T00:01:00Z");

    job.falhar("timeout", proxima, NOW);

    expect(job.status).toBe(ScheduledJobStatus.PENDENTE);
    expect(job.tentativas).toBe(1);
    expect(job.agendadoPara).toEqual(proxima);
    expect(job.ultimoErro).toBe("timeout");
  });

  it("falhar() sem proximaTentativa (null) manda para MORTO", () => {
    const job = buildJob({ tentativas: 2, maxTentativas: 3 });
    job.iniciarExecucao(NOW);

    job.falhar("erro final", null, NOW);

    expect(job.status).toBe(ScheduledJobStatus.MORTO);
    expect(job.tentativas).toBe(3);
  });

  it("falhar() só é permitido a partir de EXECUTANDO", () => {
    const job = buildJob();
    expect(() => job.falhar("erro", null, NOW)).toThrow(InvalidJobTransitionError);
  });
});
