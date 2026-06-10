import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';

import { loadSearchReportFromXlsx } from '../app/inputs/loadSearchReportFromXlsx.js';
import { compareSearchReportWithSuggestions } from '../app/compare/compareSearchReportWithSuggestions.js';
import { saveComparisonToXlsx } from '../app/outputs/saveComparisonToXlsx.js';

const SEARCH_REPORT_PATH = path.join(
    process.cwd(),
    'data',
    'BARRA DE BUSQUEDAS MAYO.xlsx'
);

function loadProductosAgrupadosFromResultadosXlsx(filePath) {

    const workbook = xlsx.readFile(filePath);

    const sheetName = workbook.SheetNames.includes('Resultados')
        ? 'Resultados'
        : workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
    });

    const productos = [];

    let productoActual = null;

    for (let i = 1; i < rows.length; i++) {

        const row = rows[i];

        const producto = String(row[0] || '').trim();
        const keyword = String(row[1] || '').trim();

        if (producto) {
            productoActual = {
                producto,
                resultadosUnicos: [],
                totalSugerenciasUnicas: 0,
                keywordsDetalle: [],
            };

            productos.push(productoActual);
        }

        if (!productoActual) {
            continue;
        }

        if (keyword) {
            productoActual.resultadosUnicos.push(keyword);
            productoActual.keywordsDetalle.push({
                keyword,
                origen: 'Resultado XLSX',
            });
        }
    }

    for (const item of productos) {
        item.totalSugerenciasUnicas = item.resultadosUnicos.length;
    }

    return productos;
}

async function run() {

    console.log('🔄 Iniciando SOLO Comparación (Pasos 3, 4, 6)\n');

    console.log('📁 Buscando archivo de resultados más reciente...\n');

    const outputDir = process.cwd();

    const files = fs.readdirSync(outputDir)
        .filter(f => f.startsWith('productos-keywords-resultados-') && f.endsWith('.xlsx'))
        .sort()
        .reverse();

    if (files.length === 0) {
        console.error('❌ Error: No se encontró archivo de resultados.');
        console.error('   Ejecuta primero: node scripts/index.js');
        process.exit(1);
    }

    const resultadosFile = files[0];
    const resultadosPath = path.join(outputDir, resultadosFile);

    console.log(`✅ Archivo de resultados encontrado: ${resultadosFile}\n`);

    console.log('📊 Paso 3: Cargando reporte de búsquedas...\n');

    const busquedasReporte = loadSearchReportFromXlsx(
        SEARCH_REPORT_PATH,
        'Búsquedas'
    );

    console.log(`✅ Búsquedas cargadas: ${busquedasReporte.length}\n`);

    console.log('📦 Cargando productos agrupados desde Resultados...\n');

    const productosAgrupados = loadProductosAgrupadosFromResultadosXlsx(resultadosPath);

    console.log(`✅ Productos agrupados cargados: ${productosAgrupados.length}\n`);

    console.log('🔄 Paso 4: Ejecutando comparación...\n');

    const comparison = compareSearchReportWithSuggestions(
        busquedasReporte,
        productosAgrupados
    );

    console.log('💾 Paso 6: Guardando comparación...\n');

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    const comparisonPath = path.join(
        process.cwd(),
        `comparacion-busquedas-vs-sugerencias-${date}_${time}.xlsx`
    );

    saveComparisonToXlsx(
        comparisonPath,
        comparison
    );

    console.log('\n═══════════════════════════════════════');
    console.log('✅ COMPARACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════');
    console.log(`\n📊 Estadísticas:`);
    console.log(`   Búsquedas analizadas: ${comparison.coincidencias.length + comparison.busquedasSinSugerencia.length}`);
    console.log(`   ✅ Coincidencias: ${comparison.coincidencias.length}`);
    console.log(`   ⚠️  Sin sugerencia: ${comparison.busquedasSinSugerencia.length}`);
    console.log(`   🆕 Oportunidades: ${comparison.oportunidadesSugeridas.length}`);

    console.log(`\n📁 Archivo generado:`);
    console.log(`   ${comparisonPath}\n`);
}

run().catch(console.error);