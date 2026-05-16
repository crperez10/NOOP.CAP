import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import XLSX from "xlsx";
import { NbuEntry } from "../models/NbuEntry.js";
import { AppSetting } from "../models/AppSetting.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workbookPath = path.join(__dirname, "..", "data", "NBU_MongoDB_ready.xlsx");

export async function ensureNbuSeeded() {
  if (!fs.existsSync(workbookPath)) return;

  const datasetHash = fileHash(workbookPath);
  const setting = await AppSetting.findOne({ key: "nbuDatasetHash" }).lean();
  const existing = await NbuEntry.estimatedDocumentCount();
  if (existing && setting?.value?.hash === datasetHash) return;

  const workbook = XLSX.readFile(workbookPath, { cellText: true, cellDates: false });
  const actualRows = sheetRows(workbook, "nbu_actual");
  if (!actualRows.length) return;

  const metadataMap = mapByCode(sheetRows(workbook, "nbu_metadata"));
  const historyMap = groupByCode(sheetRows(workbook, "nbu_historial"));
  const changesMap = groupByCode(sheetRows(workbook, "nbu_cambios"));

  const docs = actualRows
    .map((row) => toNbuDocument(row, metadataMap.get(cleanText(row.codigo)), historyMap, changesMap))
    .filter(Boolean);

  if (!docs.length) return;
  await NbuEntry.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { code: doc.code },
        update: { $set: doc },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  await NbuEntry.deleteMany({ code: { $nin: docs.map((doc) => doc.code) } });
  await AppSetting.findOneAndUpdate(
    { key: "nbuDatasetHash" },
    { $set: { value: { hash: datasetHash, importedAt: new Date().toISOString(), total: docs.length } } },
    { upsert: true }
  );
}

function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sheetRows(workbook, name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function mapByCode(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const code = cleanText(row.codigo);
    if (code) map.set(code, row);
  });
  return map;
}

function groupByCode(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const code = cleanText(row.codigo);
    if (!code) return;
    const current = map.get(code) || [];
    current.push(row);
    map.set(code, current);
  });
  return map;
}

function toNbuDocument(row, metadataRow, historyMap, changesMap) {
  const code = cleanText(row.codigo);
  if (!code) return null;

  const history = (historyMap.get(code) || []).map((entry) => ({
    version: cleanText(entry.version),
    determination: cleanText(entry.determinacion),
    ub: cleanText(entry.ub),
    urgency: cleanText(entry.urgencia),
    reference: cleanText(entry.referencia),
    frequency: cleanText(entry.frecuencia),
    section: cleanText(entry.seccion),
    isCurrent: toBoolean(entry.es_fuente_actual),
  }));

  const changes = (changesMap.get(code) || []).map((entry) => ({
    comparedVersion: cleanText(entry.version_comparada),
    field: cleanText(entry.campo),
    previousValue: cleanText(entry.valor_version),
    currentValue: cleanText(entry.valor_actual),
    changeType: cleanText(entry.tipo_cambio),
  }));

  const metadata = {
    synonyms: cleanText(metadataRow?.sinonimias_2016),
    abbreviations: cleanText(metadataRow?.abreviaturas_2016),
    interpretationRules: cleanText(metadataRow?.normas_e_interpretaciones_2016),
    deprecatedPractices: cleanText(metadataRow?.practicas_en_desuso_2016),
    observations: cleanText(metadataRow?.observaciones),
    covidUpdate: cleanText(metadataRow?.actualizacion_covid_2020),
    covidDetail: cleanText(metadataRow?.covid_detalle),
    auxiliaryDetermination: cleanText(metadataRow?.determinacion_aux),
    finalUb: cleanText(metadataRow?.ub_final2),
  };

  const current = {
    determination: cleanText(row.determinacion),
    ub: cleanText(row.ub),
    urgency: cleanText(row.urgencia),
    reference: cleanText(row.referencia),
    frequency: cleanText(row.frecuencia),
    source: cleanText(row.fuente_actual),
  };

  return {
    code,
    searchBlob: buildSearchBlob(code, current, metadata),
    current,
    latestUpdate: resolveLatestUpdate(current.source, history, metadata.observations),
    metadata,
    history,
    changes,
  };
}

function buildSearchBlob(code, current, metadata) {
  return [
    code,
    current.determination,
    metadata.abbreviations,
    metadata.synonyms,
    metadata.auxiliaryDetermination,
  ]
    .join(" ")
    .trim()
    .toLocaleLowerCase("es");
}

function resolveLatestUpdate(source, history, observations) {
  if (source) return source;
  const currentHistory = history.find((entry) => entry.isCurrent && entry.version);
  if (currentHistory?.version) return currentHistory.version;
  const observationMatch = String(observations || "").match(/(\d{1,2}\/\d{4}|\d{4})/);
  return observationMatch?.[1] || "";
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toBoolean(value) {
  return cleanText(value).toLocaleLowerCase("es") === "verdadero";
}
