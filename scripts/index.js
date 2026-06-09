import path from 'path';

import { createBrowser, scrapeSuggestions, agruparResultadosPorProducto } from '../app/scraper/googleScraper.js';
import { saveKeywords, buildSummary } from '../app/keywords/saveKeywords.js';
import { loadProductKeywordsFromXlsx } from '../app/inputs/loadProductKeywordsFromXlsx.js';
import { saveResultsToXlsx } from '../app/outputs/saveResultsToXlsx.js';
import { loadSearchReportFromXlsx } from '../app/inputs/loadSearchReportFromXlsx.js';
import { compareSearchReportWithSuggestions } from '../app/compare/compareSearchReportWithSuggestions.js';
import { saveComparisonToXlsx } from '../app/outputs/saveComparisonToXlsx.js';

const XLSX_PATH = path.join(
    process.cwd(),
    'data',
    'Productos-keywords-relacionadas-1.xlsx'
);

const SEARCH_REPORT_PATH = path.join(
    process.cwd(),
    'data',
    'reporte-busquedas-mayo.xlsx'
);

async function run() {

    const productos = loadProductKeywordsFromXlsx(XLSX_PATH, 'Productos');

    console.log(`Productos cargados: ${productos.length}`);

    const { context, page } = await createBrowser();

    const todosResultados = [];

    for (const item of productos) {

        const { producto, keywords } = item;

        console.log('\n══════════════════════════════════');
        console.log(`Producto: ${producto}`);
        console.log(`Keywords base: ${keywords.length}`);

        for (const keyword of keywords) {

            try {

                console.log(`\nConsulta base: ${keyword}`);

                const resultado = await scrapeSuggestions(page, keyword);

                resultado.producto = producto;
                resultado.consulta = keyword;

                todosResultados.push(resultado);

                saveKeywords(keyword, resultado);

                const delay = Math.floor(Math.random() * 8000) + 6000;

                console.log(
                    `\nEsperando ${(delay / 1000).toFixed(1)}s antes de la siguiente consulta...`
                );

                await page.waitForTimeout(delay);

            } catch (error) {

                console.error(`Error con consulta "${keyword}":`, error);

                todosResultados.push({
                    producto,
                    modelo: keyword,
                    consulta: keyword,
                    error: true,
                    mensaje: error.message,
                });
            }
        }
    }

    await context.close();

    const resultadosValidos = todosResultados.filter(r => !r.error);
    const summary = buildSummary(resultadosValidos);
    const now = new Date();
    const date = now.toISOString().split('T')[0];

    const time = now.toTimeString()
        .split(' ')[0]
        .replace(/:/g, '-');

    const productosAgrupados = agruparResultadosPorProducto(resultadosValidos);

    const outputPath = path.join(
        process.cwd(),
        `productos-keywords-resultados-${date}_${time}.xlsx`
    );

    saveResultsToXlsx(
        XLSX_PATH,
        outputPath,
        productosAgrupados
    );

    const busquedasReporte = loadSearchReportFromXlsx(
        SEARCH_REPORT_PATH,
        'Búsquedas'
    );

    const comparison = compareSearchReportWithSuggestions(
        busquedasReporte,
        productosAgrupados
    );

    const comparisonPath = path.join(
        process.cwd(),
        `comparacion-busquedas-vs-sugerencias-${date}_${time}.xlsx`
    );

    saveComparisonToXlsx(
        comparisonPath,
        comparison
    );

    console.log('\n══════════════════════════════════');
    console.log('Resumen general');

    for (const item of summary) {

        console.log(`\nConsulta: ${item.modelo}`);
        console.log(`Total sugerencias únicas: ${item.totalSugerenciasUnicas}`);

        for (const s of item.sugerencias) {
            console.log(`  - ${s}`);
        }
    }
}

run().catch(console.error);