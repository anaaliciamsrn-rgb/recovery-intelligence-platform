import { ListUsersUseCase } from "../../../src/modules/identity/application/use-cases/ListUsersUseCase.js";
import { User } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import { FakeUserRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("ListUsersUseCase", () => {
  it("lista usuários com papel e status, sem expor o hash de senha", async () => {
    const userRepository = new FakeUserRepository();
    userRepository.seed(
      User.create({
        id: "user-1",
        email: Email.create("nova@example.com"),
        passwordHash: PasswordHash.fromHash("$argon2id$fake$hash"),
        roles: ["VIEWER"],
        accountStatus: "ACTIVE",
        failedLoginAttempts: 0,
        lockedUntil: null,
        mfaEnabled: false,
        nome: "Ana",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );

    const useCase = new ListUsersUseCase(userRepository);
    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "user-1",
      email: "nova@example.com",
      nome: "Ana",
      roles: ["VIEWER"],
      accountStatus: "ACTIVE",
    });
    expect(result[0]).not.toHaveProperty("passwordHash");
  });
});
