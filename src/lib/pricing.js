const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function normalizeInput(rawValue) {
  return rawValue.trim().replace(/\s+/g, "");
}

export function parseLocalizedNumber(rawValue) {
  const compactValue = normalizeInput(rawValue);
  if (!compactValue) {
    return null;
  }

  let normalizedValue = compactValue;

  if (compactValue.includes(",") && compactValue.includes(".")) {
    if (compactValue.lastIndexOf(",") > compactValue.lastIndexOf(".")) {
      normalizedValue = compactValue.replace(/\./g, "").replace(",", ".");
    } else {
      normalizedValue = compactValue.replace(/,/g, "");
    }
  } else if (compactValue.includes(",")) {
    normalizedValue = compactValue.replace(/\./g, "").replace(",", ".");
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function toInputString(value) {
  const stringValue = String(value);
  return stringValue.includes(".") ? stringValue.replace(".", ",") : stringValue;
}

export function roundPrice(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculatePrices(baseEuro, parameters) {
  const markupDecimal = parameters.markupCompra / 100;
  const marginDecimal = parameters.margemVenda / 100;
  const rawCost = baseEuro * (1 + markupDecimal) * parameters.taxaConversao;
  const rawSale = rawCost * (1 + marginDecimal);
  const cost = roundPrice(rawCost);
  const sale = roundPrice(rawSale);

  return { cost, sale };
}

export function isDefaultParameters(parameters, defaultParameters) {
  return (
    parameters.markupCompra === defaultParameters.markupCompra &&
    parameters.margemVenda === defaultParameters.margemVenda &&
    parameters.taxaConversao === defaultParameters.taxaConversao &&
    parameters.moedaDestino === defaultParameters.moedaDestino
  );
}

export function resolveItemPrices(item, parameters, defaultParameters) {
  if (isDefaultParameters(parameters, defaultParameters)) {
    return {
      cost: item.defaultCost,
      sale: item.defaultSale,
    };
  }

  return calculatePrices(item.baseEuro, parameters);
}

export function formatPrice(value) {
  return numberFormatter.format(value);
}

export function validateParameters(draftParameters) {
  const errors = {};

  const hasMarkup = draftParameters.markupCompra.trim() !== "";
  const hasMargin = draftParameters.margemVenda.trim() !== "";
  const hasRate = draftParameters.taxaConversao.trim() !== "";

  const markup = parseLocalizedNumber(draftParameters.markupCompra);
  const margin = parseLocalizedNumber(draftParameters.margemVenda);
  const rate = parseLocalizedNumber(draftParameters.taxaConversao);

  if (hasMarkup && markup === null) {
    errors.markupCompra = "Informe um percentual válido.";
  }

  if (hasMargin && margin === null) {
    errors.margemVenda = "Informe um percentual válido.";
  }

  if (hasRate && rate === null) {
    errors.taxaConversao = "Informe um número válido.";
  } else if (hasRate && rate <= 0) {
    errors.taxaConversao = "A taxa deve ser maior que zero.";
  }

  return errors;
}
