import { useState } from "react";
import { bikesDataset } from "./data/bikesData";
import {
  formatPrice,
  parseLocalizedNumber,
  resolveItemPrices,
  validateParameters,
} from "./lib/pricing";

const brandImageUrl = "/brand/tp-maduro.jpeg";

function buildLandingPreviewItems(dataset) {
  const firstCategory = dataset.categories[0];
  if (!firstCategory) {
    return [];
  }

  return firstCategory.items.slice(0, 3).map((item) => ({
    code: item.code,
    description: item.description,
    sale: formatPrice(resolveItemPrices(item, dataset.defaultParameters, dataset.defaultParameters).sale),
  }));
}

function createDraftParameters(dataset) {
  return {
    markupCompra: "",
    margemVenda: "",
    taxaConversao: "",
    moedaDestino: dataset.defaultParameters.moedaDestino,
    query: "",
  };
}

function createAppliedParameters(dataset) {
  return {
    markupCompra: dataset.defaultParameters.markupCompra,
    margemVenda: dataset.defaultParameters.margemVenda,
    taxaConversao: dataset.defaultParameters.taxaConversao,
    moedaDestino: dataset.defaultParameters.moedaDestino,
  };
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

function ParameterField({
  label,
  suffix,
  value,
  onChange,
  error,
  placeholder,
  className = "",
  inputMode = "decimal",
}) {
  return (
    <label className={`parameter-field ${className}`}>
      <span>{label}</span>
      <div className={`parameter-field__input ${error ? "is-error" : ""}`}>
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inputMode={inputMode}
        />
        {suffix ? <strong>{suffix}</strong> : null}
      </div>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function WelcomeScreen({ dataset, onStart }) {
  const landingPreviewItems = buildLandingPreviewItems(dataset);
  const featuredCategory = dataset.categories[0];

  return (
    <main className="landing-shell">
      <section className="landing-card">
        <div className="landing-copy">
          <span className="landing-copy__eyebrow">Painel BH - TP Maduro</span>
          <h1>Precificação BH com abertura direta para a operação.</h1>

          <div className="landing-actions">
            <button type="button" className="button button--primary button--large" onClick={onStart}>
              Iniciar
            </button>
          </div>
        </div>

        <aside className="landing-preview">
          <div className="landing-preview__hero">
            <img src={brandImageUrl} alt="TP Maduro Bicycle Trading" />
            <div className="landing-preview__overlay">
              <span>TP Maduro Bicycle Trading</span>
              <strong>Painel BH</strong>
              <p></p>
            </div>
          </div>

          <header>
            <span>Prévia da gestão</span>
            <strong>Recálculo em tempo real</strong>
          </header>

          <div className="landing-preview__table">
            <div className="landing-preview__category">
              {featuredCategory
                ? `${featuredCategory.name} · ${featuredCategory.items.length} produtos`
                : "Base pronta para importação"}
            </div>

            {landingPreviewItems.map((item) => (
              <div key={item.code} className="landing-preview__row">
                <span>{item.code}</span>
                <span>{item.description}</span>
                <strong>{item.sale}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function App() {
  const dataset = bikesDataset;
  const [hasStarted, setHasStarted] = useState(false);
  const [draftParameters, setDraftParameters] = useState(() => createDraftParameters(bikesDataset));
  const [appliedParameters, setAppliedParameters] = useState(() => createAppliedParameters(bikesDataset));
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const errors = validateParameters(draftParameters);
  const normalizedQuery = draftParameters.query.trim().toLowerCase();
  const moedaDestino =
    draftParameters.moedaDestino.trim().toUpperCase() || dataset.defaultParameters.moedaDestino;
  const hasErrors = Object.keys(errors).length > 0;

  const visibleCategories = dataset.categories
    .map((category) => {
      const items = category.items
        .map((item) => ({
          ...item,
          ...resolveItemPrices(item, { ...appliedParameters, moedaDestino }, dataset.defaultParameters),
        }))
        .filter((item) => {
          if (!normalizedQuery) {
            return true;
          }

          return `${item.code} ${item.description}`.toLowerCase().includes(normalizedQuery);
        });

      return {
        ...category,
        items,
      };
    })
    .filter((category) => category.items.length > 0);

  const visibleSkuCount = visibleCategories.reduce(
    (total, category) => total + category.items.length,
    0,
  );

  function applyNumericParameter(field, nextValue) {
    if (nextValue.trim() === "") {
      setAppliedParameters((currentParameters) => ({
        ...currentParameters,
        [field]: dataset.defaultParameters[field],
      }));
      return;
    }

    const parsedValue = parseLocalizedNumber(nextValue);
    if (parsedValue === null) {
      return;
    }

    if (field === "taxaConversao" && parsedValue <= 0) {
      return;
    }

    setAppliedParameters((currentParameters) => ({
      ...currentParameters,
      [field]: parsedValue,
    }));
  }

  function handleNumericChange(field) {
    return (event) => {
      const nextValue = event.target.value;

      setDraftParameters((currentParameters) => ({
        ...currentParameters,
        [field]: nextValue,
      }));

      applyNumericParameter(field, nextValue);
      setFeedbackMessage("");
    };
  }

  function handleTextChange(field) {
    return (event) => {
      const nextValue = event.target.value;

      setDraftParameters((currentParameters) => ({
        ...currentParameters,
        [field]: nextValue,
      }));

      if (field === "moedaDestino") {
        setAppliedParameters((currentParameters) => ({
          ...currentParameters,
          moedaDestino: nextValue.trim().toUpperCase() || dataset.defaultParameters.moedaDestino,
        }));
      }
    };
  }

  function handleReset() {
    setDraftParameters(createDraftParameters(dataset));
    setAppliedParameters(createAppliedParameters(dataset));
    setFeedbackMessage("");
  }

  async function handleExport() {
    if (hasErrors) {
      setFeedbackMessage("Corrija os campos destacados antes de exportar.");
      return;
    }

    setIsExporting(true);
    setFeedbackMessage("");

    try {
      const { exportWorkbook } = await import("./lib/exportWorkbook");
      const exportedFile = await exportWorkbook(dataset, { ...appliedParameters, moedaDestino });

      downloadBlob(exportedFile.blob, exportedFile.fileName);
      setFeedbackMessage(`Arquivo exportado: ${exportedFile.fileName}`);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Falha ao exportar a planilha.");
    } finally {
      setIsExporting(false);
    }
  }

  if (!hasStarted) {
    return <WelcomeScreen dataset={dataset} onStart={() => setHasStarted(true)} />;
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <h1>PAINEL BH - TP MADURO</h1>
          <p className="dashboard-hero__meta">
            BH 2026 · {dataset.totals.skus} SKUs · {dataset.totals.categories} categorias
          </p>
        </div>
        <span className="status-chip">Recálculo em tempo real</span>
      </section>

      <section className="controls-card">
        <div className="controls-grid">
          <ParameterField
            label="Markup Compra"
            suffix="%"
            value={draftParameters.markupCompra}
            onChange={handleNumericChange("markupCompra")}
            error={errors.markupCompra}
            placeholder=""
          />
          <ParameterField
            label="Margem Venda"
            suffix="%"
            value={draftParameters.margemVenda}
            onChange={handleNumericChange("margemVenda")}
            error={errors.margemVenda}
            placeholder=""
          />
          <ParameterField
            label="Taxa Conversão"
            value={draftParameters.taxaConversao}
            onChange={handleNumericChange("taxaConversao")}
            error={errors.taxaConversao}
            placeholder=""
          />
         {/* <ParameterField
            label="Moeda Destino (rótulo)"
            value={draftParameters.moedaDestino}
            onChange={handleTextChange("moedaDestino")}
            placeholder={dataset.defaultParameters.moedaDestino}
            className="parameter-field--neutral"
            inputMode="text"
          />  */}
        </div>

        <div className="controls-toolbar">
          <div className="controls-actions">
            <button
              type="button"
              className="button button--success"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? "Exportando..." : "Exportar Excel"}
            </button>

            <button
              type="button"
              className="button button--ghost"
              onClick={handleReset}
            >
              Restaurar padrão
            </button>
          </div>

          <label className="search-box">
            <input
              value={draftParameters.query}
              onChange={handleTextChange("query")}
              placeholder="Buscar por código ou descrição."
            />
            <span>
              {visibleSkuCount}/{dataset.totals.skus}
            </span>
          </label>
        </div>

        {hasErrors ? (
          <div className="error-banner">
            Há campos inválidos no painel. O preview foi mantido com o último cálculo válido.
          </div>
        ) : null}

        <div className="controls-footer">
          {feedbackMessage ? <span>{feedbackMessage}</span> : null}
        </div>
      </section>

      <section className="table-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>CODE</th>
                <th>DESC.</th>
                <th>SPECS</th>
                <th>SIZES</th>
                <th>BHU</th>
                <th className="th-sales">SALES</th>
                <th className="th-cost">DISTRIBUTOR COST (STANDARD)</th>
              </tr>
            </thead>
            <tbody>
              {visibleCategories.map((category) => (
                <FragmentCategory key={category.name} category={category} />
              ))}
            </tbody>
          </table>

          {!visibleCategories.length ? (
            <div className="empty-state">Nenhum SKU encontrado com esse filtro.</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function FragmentCategory({ category }) {
  return (
    <>
      <tr className="category-row">
        <td colSpan="7">
          <strong>{category.name}</strong>
          <span>{category.items.length} produtos</span>
        </td>
      </tr>

      {category.items.map((item) => (
        <tr key={item.code}>
          <td className="cell-code">{item.code}</td>
          <td className="cell-description">{item.description}</td>
          <td className="cell-specs">{item.specs}</td>
          <td>{item.sizes}</td>
          <td>{item.bhu}</td>
          <td className="cell-sales">{formatPrice(item.sale)}</td>
          <td className="cell-cost">{formatPrice(item.cost)}</td>
        </tr>
      ))}
    </>
  );
}
