import JSZip from "jszip";
import { resolveItemPrices } from "./pricing.js";

const TEMPLATE_URL = "/templates/PricesBH_2026_AED_Final_base.xlsx";
const DEFAULT_WORKSHEET_PATH = "xl/worksheets/sheet1.xml";

function sanitizeFileLabel(label) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "AED";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function replaceCell(sheetXml, ref, nextInnerXml, { inlineString = false } = {}) {
  const cellPattern = new RegExp(`<c\\b([^>]*)\\br="${ref}"([^>]*)>[\\s\\S]*?<\\/c>`);

  if (!cellPattern.test(sheetXml)) {
    throw new Error(`Célula ${ref} não encontrada no template.`);
  }

  return sheetXml.replace(cellPattern, (fullMatch, leftAttrs, rightAttrs) => {
    let attrs = `${leftAttrs}${rightAttrs}`.replace(/\s+t="[^"]*"/g, "");
    if (inlineString) {
      attrs = `${attrs} t="inlineStr"`;
    }

    return `<c r="${ref}"${attrs}>${nextInnerXml}</c>`;
  });
}

function setStringCell(sheetXml, ref, value) {
  const inlineString = `<is><t xml:space="preserve">${escapeXml(value)}</t></is>`;
  return replaceCell(sheetXml, ref, inlineString, { inlineString: true });
}

function setNumberCell(sheetXml, ref, value) {
  return replaceCell(sheetXml, ref, `<v>${value}</v>`);
}

function updateWorksheetXml(sheetXml, dataset, parameters) {
  const currencyLabel = parameters.moedaDestino.trim().toUpperCase() || "AED";
  let nextXml = setStringCell(sheetXml, dataset.titleCell || "G1", `BH 2026 (${currencyLabel})`);

  for (const category of dataset.categories) {
    nextXml = setStringCell(nextXml, `A${category.templateRow}`, category.name);

    for (const item of category.items) {
      const prices = resolveItemPrices(item, parameters, dataset.defaultParameters);

      nextXml = setStringCell(nextXml, `A${item.templateRow}`, item.code);
      nextXml = setStringCell(nextXml, `B${item.templateRow}`, item.description);
      nextXml = setStringCell(nextXml, `C${item.templateRow}`, item.specs);
      nextXml = setStringCell(nextXml, `D${item.templateRow}`, item.sizes);
      nextXml = setStringCell(nextXml, `E${item.templateRow}`, item.bhu);
      nextXml = setNumberCell(nextXml, `F${item.templateRow}`, prices.sale);
      nextXml = setNumberCell(nextXml, `G${item.templateRow}`, prices.cost);
    }
  }

  return nextXml;
}

export async function buildWorkbookBlob(templateData, dataset, parameters) {
  const zip = await JSZip.loadAsync(templateData);
  const worksheetPath = dataset.worksheetPath || DEFAULT_WORKSHEET_PATH;
  const worksheetFile = zip.file(worksheetPath);

  if (!worksheetFile) {
    throw new Error("A aba principal não foi encontrada no template.");
  }

  const sheetXml = await worksheetFile.async("string");
  const updatedSheetXml = updateWorksheetXml(sheetXml, dataset, parameters);
  zip.file(worksheetPath, updatedSheetXml);

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function exportWorkbook(dataset, parameters, templateData = null) {
  let workbookData = templateData;

  if (!workbookData) {
    const response = await fetch(TEMPLATE_URL);
    if (!response.ok) {
      throw new Error("Não foi possível carregar o template da planilha.");
    }

    workbookData = await response.arrayBuffer();
  }

  const blob = await buildWorkbookBlob(workbookData, dataset, parameters);
  const currencyLabel = parameters.moedaDestino.trim().toUpperCase() || "AED";

  return {
    blob,
    fileName: `PricesBH_2026_${sanitizeFileLabel(currencyLabel)}.xlsx`,
  };
}
