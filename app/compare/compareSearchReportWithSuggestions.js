function normalizeText(value) {
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

function buildSuggestionIndex(productosAgrupados) {

    const suggestionMap = new Map();

    for (const producto of productosAgrupados) {

        const url = producto.producto || '';

        const keywordsDetalle = producto.keywordsDetalle || [];

        for (const item of keywordsDetalle) {

            const keyword = item.keyword || '';
            const origen = item.origen || 'Sugerencia Google';

            const keywordNormalizada = normalizeText(keyword);

            if (!keywordNormalizada) continue;

            if (!suggestionMap.has(keywordNormalizada)) {
                suggestionMap.set(keywordNormalizada, []);
            }

            suggestionMap.get(keywordNormalizada).push({
                producto: url,
                keyword,
                origen,
            });
        }
    }

    return suggestionMap;
}

function compareSearchReportWithSuggestions(busquedasReporte, productosAgrupados) {

    const suggestionMap = buildSuggestionIndex(productosAgrupados);

    const coincidencias = [];
    const busquedasSinSugerencia = [];
    const busquedasReporteSet = new Set();

    for (const item of busquedasReporte) {

        const busquedaNormalizada = normalizeText(
            item.busquedaNormalizada || item.busqueda
        );

        if (!busquedaNormalizada) continue;

        busquedasReporteSet.add(busquedaNormalizada);

        if (suggestionMap.has(busquedaNormalizada)) {

            const matches = suggestionMap.get(busquedaNormalizada);

            for (const match of matches) {
                coincidencias.push({
                    busqueda: item.busqueda,
                    cantidad: item.cantidad,
                    producto: match.producto,
                    keywordSugerida: match.keyword,
                    tipo: match.origen === 'Consulta base'
                        ? 'Coincidencia con consulta base'
                        : 'Coincidencia con sugerencia Google',
                });
            }

        } else {

            busquedasSinSugerencia.push({
                busqueda: item.busqueda,
                cantidad: item.cantidad,
                tipo: 'Búsqueda interna sin sugerencia obtenida',
            });
        }
    }

    const oportunidadesSugeridas = [];

    for (const producto of productosAgrupados) {

        for (const keyword of producto.resultadosUnicos || []) {

            const keywordNormalizada = normalizeText(keyword);

            if (!keywordNormalizada) continue;

            if (!busquedasReporteSet.has(keywordNormalizada)) {
                oportunidadesSugeridas.push({
                    producto: producto.producto,
                    keyword,
                    tipo: 'Sugerencia no buscada internamente',
                });
            }
        }
    }

    return {
        coincidencias,
        busquedasSinSugerencia,
        oportunidadesSugeridas,
    };
}

export {
    compareSearchReportWithSuggestions,
};