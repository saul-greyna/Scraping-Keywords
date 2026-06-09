import xlsx from 'xlsx';

function rowsToSheet(rows) {
    return xlsx.utils.aoa_to_sheet(rows);
}

function saveResultsToXlsx(inputPath, outputPath, productosAgrupados) {

    const workbook = xlsx.readFile(inputPath);

    const resultadosRows = [
        ['Producto', 'Keywords']
    ];

    const resumenRows = [
        ['Producto', 'Total sugerencias únicas']
    ];

    for (const item of productosAgrupados) {

        resumenRows.push([
            item.producto,
            item.totalSugerenciasUnicas
        ]);

        if (item.resultadosUnicos.length === 0) {
            resultadosRows.push([
                item.producto,
                ''
            ]);

            continue;
        }

        item.resultadosUnicos.forEach((keyword, index) => {
            resultadosRows.push([
                index === 0 ? item.producto : '',
                keyword
            ]);
        });
    }

    workbook.Sheets['Resultados'] = rowsToSheet(resultadosRows);
    workbook.Sheets['Resumen'] = rowsToSheet(resumenRows);

    if (!workbook.SheetNames.includes('Resultados')) {
        workbook.SheetNames.push('Resultados');
    }

    if (!workbook.SheetNames.includes('Resumen')) {
        workbook.SheetNames.push('Resumen');
    }

    xlsx.writeFile(workbook, outputPath);

    console.log(`XLSX guardado: ${outputPath}`);

    return outputPath;
}

export {
    saveResultsToXlsx,
};