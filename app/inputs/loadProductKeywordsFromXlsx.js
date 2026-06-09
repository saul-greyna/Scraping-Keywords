import xlsx from 'xlsx';

function normalizeText(value) {
    return String(value || '').trim();
}

function loadProductKeywordsFromXlsx(filePath, sheetName = 'Productos') {

    const workbook = xlsx.readFile(filePath);

    const targetSheetName =
        workbook.SheetNames.includes(sheetName)
            ? sheetName
            : workbook.SheetNames.includes('Formato')
                ? 'Formato'
                : workbook.SheetNames[0];

    const sheet = workbook.Sheets[targetSheetName];

    if (!sheet) {
        throw new Error(`No se encontró una hoja válida en el archivo XLSX`);
    }

    const rows = xlsx.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
    });

    const productos = [];

    let productoActual = null;

    for (let i = 1; i < rows.length; i++) {

        const row = rows[i];

        const producto = normalizeText(row[0]);
        const keyword = normalizeText(row[1]);

        if (producto) {
            productoActual = {
                producto,
                keywords: [],
            };

            productos.push(productoActual);
        }

        if (!productoActual) {
            continue;
        }

        if (keyword) {
            productoActual.keywords.push(keyword);
        }
    }

    return productos.filter(item => item.producto && item.keywords.length > 0);
}

export {
    loadProductKeywordsFromXlsx,
};