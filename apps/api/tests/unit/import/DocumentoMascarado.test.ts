import {
  DocumentoMascarado,
  InvalidDocumentoMascaradoError,
} from "../../../src/modules/import/domain/value-objects/DocumentoMascarado.js";

describe("DocumentoMascarado", () => {
  it("aceita o formato de mascaramento da PGFN", () => {
    const documento = DocumentoMascarado.create("***.123.456-**");

    expect(documento.digitosVisiveis()).toBe("123456");
    expect(documento.toString()).toBe("***.123.456-**");
  });

  it("aceita com espaços nas bordas", () => {
    const documento = DocumentoMascarado.create("  ***.123.456-**  ");

    expect(documento.toString()).toBe("***.123.456-**");
  });

  it("rejeita um CPF completo (não é o formato mascarado)", () => {
    expect(() => DocumentoMascarado.create("529.982.247-25")).toThrow(
      InvalidDocumentoMascaradoError,
    );
  });

  it("rejeita formato inesperado", () => {
    expect(() => DocumentoMascarado.create("123456")).toThrow(InvalidDocumentoMascaradoError);
    expect(() => DocumentoMascarado.create("")).toThrow(InvalidDocumentoMascaradoError);
  });

  it("compara por valor", () => {
    const a = DocumentoMascarado.create("***.123.456-**");
    const b = DocumentoMascarado.create("***.123.456-**");
    const c = DocumentoMascarado.create("***.999.999-**");

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
