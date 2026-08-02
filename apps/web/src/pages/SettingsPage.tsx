import { useState, type FormEvent } from "react";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";

const PRESET_COLORS = ["#4f46e5", "#0ea5e9", "#16a34a", "#d97706", "#dc2626", "#7c3aed"];

/**
 * White-label centralizado: tudo aqui só chama `setBrand()` (ThemeContext),
 * que já reescreve as CSS custom properties usadas por todo componente do
 * sistema — nenhuma cor é hardcoded em nenhuma tela, então a troca é
 * instantânea e global a partir deste único formulário.
 */
export function SettingsPage() {
  const { brand, setBrand } = useTheme();
  const { show } = useToast();

  const [productName, setProductName] = useState(brand.productName);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setBrand({
      productName,
      logoUrl: logoUrl || null,
      primaryColor,
      primaryColorHover: darken(primaryColor),
    });
    show("Marca atualizada — a mudança já está aplicada em todo o sistema.", "success");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader
          title="White label"
          subtitle="Personalize nome, logo e cores da plataforma para o seu cliente"
        />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                Nome do produto
              </label>
              <input
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                URL do logo (opcional)
              </label>
              <input
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://…"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-subtle)" }}>
                Sem logo, o sistema usa a inicial do nome do produto como ícone — como já acontece
                agora.
              </p>
            </div>

            <div>
              <label
                className="mb-2 block text-xs font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                Cor primária
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPrimaryColor(color)}
                    aria-label={`Usar ${color} como cor primária`}
                    aria-pressed={primaryColor === color}
                    className="h-8 w-8 cursor-pointer rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      boxShadow:
                        primaryColor === color
                          ? `0 0 0 2px var(--color-bg-elevated), 0 0 0 4px ${color}`
                          : "none",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  aria-label="Cor primária personalizada"
                  className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                />
              </div>
            </div>

            <div
              className="flex items-center gap-3 rounded-[var(--radius-md)] border p-4"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-sm font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-full w-full rounded-[var(--radius-sm)] object-cover"
                  />
                ) : (
                  productName.charAt(0)
                )}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {productName}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Pré-visualização
                </p>
              </div>
            </div>

            <Button type="submit">Aplicar marca</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

function darken(hex: string): string {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  const r = Math.max(0, (num >> 16) - 24);
  const g = Math.max(0, ((num >> 8) & 0xff) - 24);
  const b = Math.max(0, (num & 0xff) - 24);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
