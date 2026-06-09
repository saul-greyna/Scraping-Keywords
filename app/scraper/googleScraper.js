import { chromium } from 'playwright';

async function createBrowser() {

    const context =
        await chromium.launchPersistentContext(
            './chrome-data',
            {
                headless: false,

                viewport: {
                    width: 970,
                    height: 940,
                },

                userAgent:
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',

                locale: 'es-MX',
            }
        );

    const page = await context.newPage();

    return { context, page };
}

async function randomDelay(page, min = 2000, max = 4000) {
    const delay = Math.floor(Math.random() * (max - min)) + min;
    await page.waitForTimeout(delay);
}

async function humanBehavior(page) {
    await page.mouse.move(
        Math.random() * 500,
        Math.random() * 500
    );
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, Math.random() * 200);
    await page.waitForTimeout(500);
}

/**
 * Reposiciona el cursor haciendo clic izquierdo en una posición específica del texto.
 * No usa Home, End ni flechas es mejor hacer clic real en posicion obajetiva.
 */
async function repositionarCursor(page, query, posicion) {

    const searchInput = page.locator('textarea[name="q"]');

    await searchInput.waitFor({ state: 'visible', timeout: 10000 });

    const box = await searchInput.boundingBox();

    if (!box) {
        throw new Error('No se pudo obtener la posición del input de búsqueda');
    }

    const clickData = await searchInput.evaluate((el, data) => {

        const style = window.getComputedStyle(el);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

        const textBeforeCursor = data.query.slice(0, data.posicion);
        const textWidth = context.measureText(textBeforeCursor).width;

        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;

        return {
            textWidth,
            paddingLeft,
            paddingTop,
            fontSize: parseFloat(style.fontSize) || 16,
        };

    }, { query, posicion });

    const x = box.x + clickData.paddingLeft + clickData.textWidth + 2;
    const y = box.y + (box.height / 2);

    await page.mouse.move(x, y);
    await page.waitForTimeout(250);

    await page.mouse.click(x, y, {
        button: 'left',
        delay: 120,
    });

    console.log(`  Click izquierdo en posición ${posicion} de "${query}"`);

    await page.waitForTimeout(700);
}

async function getSuggestions(page, options) {

    const {
        query,
        tipo,
        cursorPos,
        usarClick,
    } = options;

    console.log(`  Capturando sugerencias para: "${query}"`);
    console.log(`  Tipo: ${tipo}`);

    await page.goto('https://www.google.com', {
        waitUntil: 'domcontentloaded',
    });

    await randomDelay(page, 2000, 3500);

    const searchInput = page.locator('textarea[name="q"]');

    await searchInput.click({ clickCount: 3 });
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    await searchInput.type(query, { delay: 190 });

    const espera = Math.floor(Math.random() * 1000) + 2000;
    await page.waitForTimeout(espera);

    /*
        Flujo 1: sin manipulación.
        Escritura directa.
        Captura las primeras sugerencias.
    */
    if (!usarClick) {
        console.log(`  Capturando sugerencias sin manipulación de cursor...`);

        return await captureSuggestions(page, query);
    }

    /*
        Flujo 2: con clic.
        Ejemplo: directo_click o wildcard_extremos.
        Cierra sugerencias iniciales, hace clic en la posición guardada
        y captura las sugerencias enriquecidas.
    */
    console.log(`  Presionando ESC antes del clic...`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    if (cursorPos !== null && cursorPos !== undefined) {
        console.log(`  Haciendo clic izquierdo en posición ${cursorPos}...`);
        await repositionarCursor(page, query, cursorPos);
    } else {
        console.log(`  Sin posición de clic definida...`);
    }

    return await captureSuggestions(page, query);
}

async function captureSuggestions(page, query) {

    try {
        await page.waitForSelector('ul[role="listbox"] li', {
            state: 'visible',
            timeout: 10000,
        });
    } catch {
        console.log(`  ⚠ Sin sugerencias visibles para: "${query}"`);
        return [];
    }

    await page.waitForTimeout(3000);

    const suggestions = await page
        .locator('ul[role="listbox"] li')
        .evaluateAll(elements => {

            return elements
                .map(el => {

                    const presentation = el.querySelector('div[role="presentation"]');

                    if (presentation) {
                        return presentation.innerText?.trim() || '';
                    }

                    return el.innerText?.trim() || '';
                })
                .filter(text => text.length > 0);
        });

    console.log(
        `  ✓ ${suggestions.length} sugerencias: ${suggestions.slice(0, 3).join(' | ')}...`
    );

    return suggestions;
}

function normalizarKeywordParaComparacion(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[-_/]+/g, ' ')
        .replace(/([a-z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-z])/g, '$1 $2')
        .replace(/\s+/g, ' ');
}

function agruparResultadosPorProducto(resultados) {

    const productosMap = new Map();

    for (const resultado of resultados) {

        if (resultado.error) continue;

        const producto = resultado.producto || '';

        if (!producto) continue;

        if (!productosMap.has(producto)) {
            productosMap.set(producto, new Map());
        }

        const keywordsMap = productosMap.get(producto);

        const consultaBase = String(resultado.consulta || resultado.modelo || '').trim();

        if (consultaBase) {
            const keyBase = normalizarKeywordParaComparacion(consultaBase);

            if (!keywordsMap.has(keyBase)) {
                keywordsMap.set(keyBase, {
                    keyword: consultaBase,
                    origen: 'Consulta base',
                });
            }
        }

        if (!resultado.sugerencias || typeof resultado.sugerencias !== 'object') {
            continue;
        }

        for (const tipo of Object.keys(resultado.sugerencias)) {

            const variante = resultado.sugerencias[tipo];

            if (!variante || !Array.isArray(variante.resultados)) {
                continue;
            }

            for (const sugerencia of variante.resultados) {

                const keyword = String(sugerencia || '').trim();

                if (!keyword) continue;

                const key = normalizarKeywordParaComparacion(keyword);

                if (!keywordsMap.has(key)) {
                    keywordsMap.set(key, {
                        keyword,
                        origen: 'Sugerencia Google',
                    });
                }
            }
        }
    }

    return [...productosMap.entries()].map(([producto, keywordsMap]) => {

        const keywords = [...keywordsMap.values()];

        return {
            producto,
            totalSugerenciasUnicas: keywords.length,
            resultadosUnicos: keywords.map(item => item.keyword),
            keywordsDetalle: keywords,
        };
    });
}

async function scrapeSuggestions(page, modelo) {

    console.log(`\n`);
    console.log(`Modelo: ${modelo}`);

    const queries = [
        { tipo: 'directo', query: modelo, cursorPos: null, usarClick: false, },
        { tipo: 'directo_click', query: modelo, cursorPos: 0, usarClick: true, },
        { tipo: 'wildcard_inicio', query: `*${modelo}`, cursorPos: null, usarClick: false, },
        { tipo: 'wildcard_extremos', query: `*${modelo}*`, cursorPos: 1, usarClick: true, },
    ];

    const resultado = {
        modelo,
        timestamp: new Date().toISOString(),
        sugerencias: {},
    };

    for (const { tipo, query, cursorPos, usarClick } of queries) {

        await humanBehavior(page);

        const sugerencias = await getSuggestions(page, {
            query,
            tipo,
            cursorPos,
            usarClick,
        });

        resultado.sugerencias[tipo] = {
            query,
            cursorPos,
            resultados: sugerencias,
        };

        const delay = Math.floor(Math.random() * 5000) + 5000;
        console.log(`  Esperando ${(delay / 1000).toFixed(1)}s antes de la siguiente query...`);
        await page.waitForTimeout(delay);
    }

    return resultado;
}

export {
    createBrowser,
    scrapeSuggestions,
    agruparResultadosPorProducto,
};
