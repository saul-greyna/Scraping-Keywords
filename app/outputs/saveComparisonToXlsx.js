import xlsx from 'xlsx';

function rowsToSheet(rows) {
    return xlsx.utils.aoa_to_sheet(rows);
}

function saveComparisonToXlsx(outputPath, comparison) {

    const workbook = xlsx.utils.book_new();

    const coincidenciasRows = [
        ['Búsqueda interna', 'Cantidad', 'Producto', 'Keyword sugerida', 'Tipo']
    ];

    for (const item of comparison.coincidencias) {
        coincidenciasRows.push([
            item.busqueda,
            item.cantidad,
            item.producto,
            item.keywordSugerida,
            item.tipo,
        ]);
    }

    const sinSugerenciaRows = [
        ['Búsqueda interna', 'Cantidad', 'Tipo']
    ];

    for (const item of comparison.busquedasSinSugerencia) {
        sinSugerenciaRows.push([
            item.busqueda,
            item.cantidad,
            item.tipo,
        ]);
    }

    const oportunidadesRows = [
        ['Producto', 'Keyword sugerida', 'Tipo']
    ];

    for (const item of comparison.oportunidadesSugeridas) {
        oportunidadesRows.push([
            item.producto,
            item.keyword,
            item.tipo,
        ]);
    }

    const resumenRows = [
        ['Métrica', 'Total'],
        ['Coincidencias exactas', comparison.coincidencias.length],
        ['Búsquedas internas sin sugerencia', comparison.busquedasSinSugerencia.length],
        ['Sugerencias no buscadas internamente', comparison.oportunidadesSugeridas.length],
    ];

    xlsx.utils.book_append_sheet(
        workbook,
        rowsToSheet(resumenRows),
        'Resumen'
    );

    xlsx.utils.book_append_sheet(
        workbook,
        rowsToSheet(coincidenciasRows),
        'Coincidencias'
    );

    xlsx.utils.book_append_sheet(
        workbook,
        rowsToSheet(sinSugerenciaRows),
        'Busquedas sin sugerencia'
    );

    xlsx.utils.book_append_sheet(
        workbook,
        rowsToSheet(oportunidadesRows),
        'Oportunidades'
    );

    xlsx.writeFile(workbook, outputPath);

    console.log(`Comparación guardada: ${outputPath}`);

    return outputPath;
}

export {
    saveComparisonToXlsx,
};