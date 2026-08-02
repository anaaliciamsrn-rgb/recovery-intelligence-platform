import { CreateFeatureFlagUseCase } from "../../../src/modules/feature-flags/application/use-cases/CreateFeatureFlagUseCase.js";
import { EvaluateFeatureFlagUseCase } from "../../../src/modules/feature-flags/application/use-cases/EvaluateFeatureFlagUseCase.js";
import { GetFeatureFlagUseCase } from "../../../src/modules/feature-flags/application/use-cases/GetFeatureFlagUseCase.js";
import { ListFeatureFlagsUseCase } from "../../../src/modules/feature-flags/application/use-cases/ListFeatureFlagsUseCase.js";
import { RemoveFeatureFlagOverrideUseCase } from "../../../src/modules/feature-flags/application/use-cases/RemoveFeatureFlagOverrideUseCase.js";
import { SetFeatureFlagOverrideUseCase } from "../../../src/modules/feature-flags/application/use-cases/SetFeatureFlagOverrideUseCase.js";
import { UpdateFeatureFlagUseCase } from "../../../src/modules/feature-flags/application/use-cases/UpdateFeatureFlagUseCase.js";
import {
  FakeClock,
  FakeFeatureFlagOverrideRepository,
  FakeFeatureFlagRepository,
  FakeIdGenerator,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("CreateFeatureFlagUseCase", () => {
  it("cria uma flag nova", async () => {
    const featureFlagRepository = new FakeFeatureFlagRepository();
    const useCase = new CreateFeatureFlagUseCase(
      featureFlagRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    const flag = await useCase.execute({ chave: "modulo-x", descricao: null, ativoPadrao: false });

    expect(await featureFlagRepository.findByChave("modulo-x")).not.toBeNull();
    expect(flag.ativoPadrao).toBe(false);
  });

  it("lança CONFLICT quando a chave já existe", async () => {
    const featureFlagRepository = new FakeFeatureFlagRepository();
    const useCase = new CreateFeatureFlagUseCase(
      featureFlagRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    await useCase.execute({ chave: "modulo-x", descricao: null, ativoPadrao: false });

    await expect(
      useCase.execute({ chave: "modulo-x", descricao: null, ativoPadrao: true }),
    ).rejects.toMatchObject({ kind: "CONFLICT" });
  });

  it("lança VALIDATION quando a chave é inválida", async () => {
    const useCase = new CreateFeatureFlagUseCase(
      new FakeFeatureFlagRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    await expect(
      useCase.execute({ chave: "Chave Invalida", descricao: null, ativoPadrao: false }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});

describe("UpdateFeatureFlagUseCase + GetFeatureFlagUseCase + ListFeatureFlagsUseCase", () => {
  it("atualiza a flag existente", async () => {
    const featureFlagRepository = new FakeFeatureFlagRepository();
    const createUseCase = new CreateFeatureFlagUseCase(
      featureFlagRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const updateUseCase = new UpdateFeatureFlagUseCase(featureFlagRepository, new FakeClock(NOW));
    await createUseCase.execute({ chave: "modulo-x", descricao: null, ativoPadrao: false });

    const atualizada = await updateUseCase.execute({
      chave: "modulo-x",
      descricao: "agora documentada",
      ativoPadrao: true,
    });

    expect(atualizada.descricao).toBe("agora documentada");
    expect(atualizada.ativoPadrao).toBe(true);
  });

  it("lança NOT_FOUND ao atualizar flag inexistente", async () => {
    const updateUseCase = new UpdateFeatureFlagUseCase(
      new FakeFeatureFlagRepository(),
      new FakeClock(NOW),
    );
    await expect(
      updateUseCase.execute({ chave: "inexistente", descricao: null, ativoPadrao: true }),
    ).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("GetFeatureFlagUseCase devolve a flag com seus overrides", async () => {
    const featureFlagRepository = new FakeFeatureFlagRepository();
    const featureFlagOverrideRepository = new FakeFeatureFlagOverrideRepository();
    const createUseCase = new CreateFeatureFlagUseCase(
      featureFlagRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const setOverrideUseCase = new SetFeatureFlagOverrideUseCase(
      featureFlagRepository,
      featureFlagOverrideRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const getUseCase = new GetFeatureFlagUseCase(
      featureFlagRepository,
      featureFlagOverrideRepository,
    );

    await createUseCase.execute({ chave: "modulo-x", descricao: null, ativoPadrao: false });
    await setOverrideUseCase.execute({
      chave: "modulo-x",
      escopoTipo: "TENANT",
      escopoValor: "tenant-a",
      ativo: true,
    });

    const detalhe = await getUseCase.execute("modulo-x");
    expect(detalhe.overrides).toHaveLength(1);
  });

  it("GetFeatureFlagUseCase lança NOT_FOUND para chave inexistente", async () => {
    const getUseCase = new GetFeatureFlagUseCase(
      new FakeFeatureFlagRepository(),
      new FakeFeatureFlagOverrideRepository(),
    );
    await expect(getUseCase.execute("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("ListFeatureFlagsUseCase lista todas as flags paginadas", async () => {
    const featureFlagRepository = new FakeFeatureFlagRepository();
    const createUseCase = new CreateFeatureFlagUseCase(
      featureFlagRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const listUseCase = new ListFeatureFlagsUseCase(featureFlagRepository);

    await createUseCase.execute({ chave: "modulo-a", descricao: null, ativoPadrao: false });
    await createUseCase.execute({ chave: "modulo-b", descricao: null, ativoPadrao: true });

    const pagina = await listUseCase.execute();
    expect(pagina.items).toHaveLength(2);
    expect(pagina.total).toBe(2);
  });

  it("ListFeatureFlagsUseCase pagina os resultados", async () => {
    const featureFlagRepository = new FakeFeatureFlagRepository();
    const createUseCase = new CreateFeatureFlagUseCase(
      featureFlagRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const listUseCase = new ListFeatureFlagsUseCase(featureFlagRepository);

    await createUseCase.execute({ chave: "modulo-a", descricao: null, ativoPadrao: false });
    await createUseCase.execute({ chave: "modulo-b", descricao: null, ativoPadrao: true });
    await createUseCase.execute({ chave: "modulo-c", descricao: null, ativoPadrao: true });

    const primeiraPagina = await listUseCase.execute({ page: 1, pageSize: 2 });
    expect(primeiraPagina.items).toHaveLength(2);
    expect(primeiraPagina.total).toBe(3);
  });
});

describe("SetFeatureFlagOverrideUseCase + RemoveFeatureFlagOverrideUseCase", () => {
  async function buildScenario() {
    const featureFlagRepository = new FakeFeatureFlagRepository();
    const featureFlagOverrideRepository = new FakeFeatureFlagOverrideRepository();
    const idGenerator = new FakeIdGenerator();
    const clock = new FakeClock(NOW);
    const createUseCase = new CreateFeatureFlagUseCase(featureFlagRepository, idGenerator, clock);
    const setOverrideUseCase = new SetFeatureFlagOverrideUseCase(
      featureFlagRepository,
      featureFlagOverrideRepository,
      idGenerator,
      clock,
    );
    const removeOverrideUseCase = new RemoveFeatureFlagOverrideUseCase(
      featureFlagRepository,
      featureFlagOverrideRepository,
    );
    await createUseCase.execute({ chave: "modulo-x", descricao: null, ativoPadrao: false });
    return {
      setOverrideUseCase,
      removeOverrideUseCase,
      featureFlagOverrideRepository,
      featureFlagRepository,
    };
  }

  it("cria o override quando não existe", async () => {
    const { setOverrideUseCase, featureFlagOverrideRepository, featureFlagRepository } =
      await buildScenario();

    await setOverrideUseCase.execute({
      chave: "modulo-x",
      escopoTipo: "TENANT",
      escopoValor: "tenant-a",
      ativo: true,
    });

    const flag = await featureFlagRepository.findByChave("modulo-x");
    const overrides = await featureFlagOverrideRepository.findByFeatureFlagId(flag!.id);
    expect(overrides).toHaveLength(1);
    expect(overrides[0]?.ativo).toBe(true);
  });

  it("faz upsert — chamar de novo para o mesmo escopo atualiza em vez de duplicar", async () => {
    const { setOverrideUseCase, featureFlagOverrideRepository, featureFlagRepository } =
      await buildScenario();

    await setOverrideUseCase.execute({
      chave: "modulo-x",
      escopoTipo: "TENANT",
      escopoValor: "tenant-a",
      ativo: true,
    });
    await setOverrideUseCase.execute({
      chave: "modulo-x",
      escopoTipo: "TENANT",
      escopoValor: "tenant-a",
      ativo: false,
    });

    const flag = await featureFlagRepository.findByChave("modulo-x");
    const overrides = await featureFlagOverrideRepository.findByFeatureFlagId(flag!.id);
    expect(overrides).toHaveLength(1);
    expect(overrides[0]?.ativo).toBe(false);
  });

  it("lança NOT_FOUND ao definir override para flag inexistente", async () => {
    const { setOverrideUseCase } = await buildScenario();
    await expect(
      setOverrideUseCase.execute({
        chave: "inexistente",
        escopoTipo: "TENANT",
        escopoValor: "tenant-a",
        ativo: true,
      }),
    ).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("remove o override — o escopo volta a herdar o padrão", async () => {
    const {
      setOverrideUseCase,
      removeOverrideUseCase,
      featureFlagOverrideRepository,
      featureFlagRepository,
    } = await buildScenario();
    await setOverrideUseCase.execute({
      chave: "modulo-x",
      escopoTipo: "TENANT",
      escopoValor: "tenant-a",
      ativo: true,
    });

    await removeOverrideUseCase.execute({
      chave: "modulo-x",
      escopoTipo: "TENANT",
      escopoValor: "tenant-a",
    });

    const flag = await featureFlagRepository.findByChave("modulo-x");
    expect(await featureFlagOverrideRepository.findByFeatureFlagId(flag!.id)).toHaveLength(0);
  });
});

describe("EvaluateFeatureFlagUseCase", () => {
  it("resolve a partir da flag + overrides persistidos", async () => {
    const featureFlagRepository = new FakeFeatureFlagRepository();
    const featureFlagOverrideRepository = new FakeFeatureFlagOverrideRepository();
    const idGenerator = new FakeIdGenerator();
    const clock = new FakeClock(NOW);
    const createUseCase = new CreateFeatureFlagUseCase(featureFlagRepository, idGenerator, clock);
    const setOverrideUseCase = new SetFeatureFlagOverrideUseCase(
      featureFlagRepository,
      featureFlagOverrideRepository,
      idGenerator,
      clock,
    );
    const evaluateUseCase = new EvaluateFeatureFlagUseCase(
      featureFlagRepository,
      featureFlagOverrideRepository,
    );

    await createUseCase.execute({ chave: "modulo-x", descricao: null, ativoPadrao: false });
    await setOverrideUseCase.execute({
      chave: "modulo-x",
      escopoTipo: "USUARIO",
      escopoValor: "user-1",
      ativo: true,
    });

    const resolucao = await evaluateUseCase.execute({
      chave: "modulo-x",
      contexto: { userId: "user-1" },
    });
    expect(resolucao).toEqual({ ativo: true, origem: "USUARIO" });

    const resolucaoPadrao = await evaluateUseCase.execute({
      chave: "modulo-x",
      contexto: { userId: "outro-usuario" },
    });
    expect(resolucaoPadrao).toEqual({ ativo: false, origem: "PADRAO" });
  });

  it("lança NOT_FOUND para chave inexistente", async () => {
    const evaluateUseCase = new EvaluateFeatureFlagUseCase(
      new FakeFeatureFlagRepository(),
      new FakeFeatureFlagOverrideRepository(),
    );
    await expect(
      evaluateUseCase.execute({ chave: "inexistente", contexto: {} }),
    ).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});
