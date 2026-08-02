import { JobRetryPolicy } from "../../../src/modules/scheduler/domain/services/JobRetryPolicy.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("JobRetryPolicy", () => {
  it("calcula backoff exponencial: 30s após a 1ª falha", () => {
    const proxima = JobRetryPolicy.calcularProximaTentativa(0, 5, NOW);
    expect(proxima).toEqual(new Date(NOW.getTime() + 30_000));
  });

  it("dobra o atraso a cada tentativa: 60s após a 2ª falha, 120s após a 3ª", () => {
    expect(JobRetryPolicy.calcularProximaTentativa(1, 5, NOW)).toEqual(
      new Date(NOW.getTime() + 60_000),
    );
    expect(JobRetryPolicy.calcularProximaTentativa(2, 5, NOW)).toEqual(
      new Date(NOW.getTime() + 120_000),
    );
  });

  it("limita o atraso a 1 hora mesmo com muitas tentativas", () => {
    const proxima = JobRetryPolicy.calcularProximaTentativa(10, 20, NOW);
    expect(proxima).toEqual(new Date(NOW.getTime() + 3_600_000));
  });

  it("devolve null (fila-morta) quando esta falha esgota maxTentativas", () => {
    expect(JobRetryPolicy.calcularProximaTentativa(2, 3, NOW)).toBeNull();
  });

  it("devolve null quando já passou de maxTentativas", () => {
    expect(JobRetryPolicy.calcularProximaTentativa(5, 3, NOW)).toBeNull();
  });
});
