import path from 'path';
import fs from 'fs';

function calcularUnicos(resultado) {

    const unicos = new Set();

    if (!resultado.sugerencias || typeof resultado.sugerencias !== 'object') {
        return [];
    }

    for (const tipo of Object.keys(resultado.sugerencias)) {

        const variante = resultado.sugerencias[tipo];

        if (!variante || !Array.isArray(variante.resultados)) continue;

        for (const s of variante.resultados) {
            if (s && typeof s === 'string') {
                unicos.add(s);
            }
        }
    }

    return [...unicos];
}

function saveKeywords(modeloSlug, resultado) {

    const dir = path.join(process.cwd(), 'output', 'json');

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const safeSlug = modeloSlug
        .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
        .replace(/_+/g, '_')
        .trim();

    const now = new Date();

    const date = now.toISOString().split('T')[0];

    const time = now.toTimeString()
        .split(' ')[0]
        .replace(/:/g, '-');

    const resultadosUnicos = calcularUnicos(resultado);

    const resultadoCompleto = {
        ...resultado,
        resumenProducto: resultado.modelo,
        totalSugerenciasUnicas: resultadosUnicos.length,
        resultadosUnicos,
    };

    const fileName = `keywords-${date}_${time} - ${safeSlug}.json`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(
        filePath,
        JSON.stringify(resultadoCompleto, null, 2),
        'utf8'
    );

    console.log(`Guardado: ${filePath}`);

    return filePath;
}

function buildSummary(resultados) {

    const summary = [];

    for (const resultado of resultados) {

        if (!resultado.sugerencias || typeof resultado.sugerencias !== 'object') {
            console.warn(`Sin sugerencias para modelo: ${resultado.modelo}`);
            continue;
        }

        const resultadosUnicos = calcularUnicos(resultado);

        summary.push({
            modelo: resultado.modelo,
            totalSugerenciasUnicas: resultadosUnicos.length,
            sugerencias: resultadosUnicos,
        });
    }

    return summary;
}

export {
    saveKeywords,
    buildSummary,
};