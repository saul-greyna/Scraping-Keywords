import xlsx from 'xlsx';

function normalizeText(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function loadSearchReportFromXlsx(filePath, sheetName = 'Búsquedas') {

    const workbook = xlsx.readFile(filePath);

    const targetSheetName =
        workbook.SheetNames.includes(sheetName)
            ? sheetName
            : workbook.SheetNames[0];

    const sheet = workbook.Sheets[targetSheetName];

    if (!sheet) {
        throw new Error(`No se encontró una hoja válida en el reporte`);
    }

    const rows = xlsx.utils.sheet_to_json(sheet, {
        defval: '',
    });

    const busquedasMap = new Map();

    for (const row of rows) {

        const keys = Object.keys(row);

        const busquedaKey = keys.find(key => {
            const cleanKey = normalizeText(key);

            return cleanKey.includes('busqueda') ||
                cleanKey.includes('query') ||
                cleanKey.includes('search') ||
                cleanKey.includes('termino') ||
                cleanKey.includes('keyword');
        });

        const cantidadKey = keys.find(key => {
            const cleanKey = normalizeText(key);

            return cleanKey.includes('cantidad') ||
                cleanKey.includes('count') ||
                cleanKey.includes('total') ||
                cleanKey.includes('veces') ||
                cleanKey.includes('busquedas');
        });

        if (!busquedaKey) continue;

        const busquedaOriginal = String(row[busquedaKey] || '').trim();
        const busquedaNormalizada = normalizeText(busquedaOriginal);

        if (!busquedaNormalizada) continue;

        const cantidad = cantidadKey
            ? parseInt(row[cantidadKey] || 1, 10)
            : 1;

        if (!busquedasMap.has(busquedaNormalizada)) {
            busquedasMap.set(busquedaNormalizada, {
                busqueda: busquedaOriginal,
                busquedaNormalizada,
                cantidad: Number.isNaN(cantidad) ? 1 : cantidad,
            });
        } else {
            const item = busquedasMap.get(busquedaNormalizada);
            item.cantidad += Number.isNaN(cantidad) ? 1 : cantidad;
        }
    }

    return [...busquedasMap.values()];
}

export {
    loadSearchReportFromXlsx,
};