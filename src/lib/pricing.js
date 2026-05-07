const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function normalizeInput(rawValue) {
  return rawValue.trim().replace(/\s+/g, "").replace(/%$/, "");
}

function isRelativeAdjustment(rawValue) {
  const compactValue = normalizeInput(rawValue);
  return compactValue.startsWith("+") || compactValue.startsWith("-");
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

export function resolveNumericParameterValue(rawValue, defaultValue) {
  const parsedValue = parseLocalizedNumber(rawValue);
  if (parsedValue === null) {
    return null;
  }

  if (isRelativeAdjustment(rawValue)) {
    return defaultValue + parsedValue;
  }

  return parsedValue;
}

export function toInputString(value) {
  const stringValue = String(value);
  return stringValue.includes(".") ? stringValue.replace(".", ",") : stringValue;
}

export function roundPrice(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function applyPercentAdjustment(value, rawAdjustment) {
  if (!rawAdjustment || rawAdjustment.trim() === "") {
    return value;
  }

  const adjustment = parseLocalizedNumber(rawAdjustment);
  if (adjustment === null || adjustment <= -100) {
    return value;
  }

  return roundPrice(value * (1 + adjustment / 100));
}

export function validatePercentAdjustment(rawAdjustment) {
  if (!rawAdjustment || rawAdjustment.trim() === "") {
    return "";
  }

  const adjustment = parseLocalizedNumber(rawAdjustment);
  if (adjustment === null) {
    return "Percentual inválido.";
  }

  if (adjustment <= -100) {
    return "Deve ser maior que -100%.";
  }

  return "";
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

export function resolveItemPrices(item, parameters, defaultParameters, adjustments = {}) {
  const prices = isDefaultParameters(parameters, defaultParameters)
    ? {
        cost: item.defaultCost,
        sale: item.defaultSale,
      }
    : calculatePrices(item.baseEuro, parameters);

  return {
    cost: applyPercentAdjustment(prices.cost, adjustments.cost),
    sale: applyPercentAdjustment(prices.sale, adjustments.sale),
  };
}

export function formatPrice(value) {
  return numberFormatter.format(value);
}

export function validateParameters(draftParameters, defaultParameters) {
  const errors = {};

  const hasMarkup = draftParameters.markupCompra.trim() !== "";
  const hasMargin = draftParameters.margemVenda.trim() !== "";
  const hasRate = draftParameters.taxaConversao.trim() !== "";

  const markup = resolveNumericParameterValue(
    draftParameters.markupCompra,
    defaultParameters.markupCompra,
  );
  const margin = resolveNumericParameterValue(
    draftParameters.margemVenda,
    defaultParameters.margemVenda,
  );
  const rate = resolveNumericParameterValue(
    draftParameters.taxaConversao,
    defaultParameters.taxaConversao,
  );

  if (hasMarkup && markup === null) {
    errors.markupCompra = "Informe um percentual válido.";
  } else if (hasMarkup && markup <= -100) {
    errors.markupCompra = "O resultado final deve ser maior que -100%.";
  }

  if (hasMargin && margin === null) {
    errors.margemVenda = "Informe um percentual válido.";
  } else if (hasMargin && margin <= -100) {
    errors.margemVenda = "O resultado final deve ser maior que -100%.";
  }

  if (hasRate && rate === null) {
    errors.taxaConversao = "Informe um número válido.";
  } else if (hasRate && rate <= 0) {
    errors.taxaConversao = "A taxa deve ser maior que zero.";
  }

  return errors;
}
