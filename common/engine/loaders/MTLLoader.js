export class MTLLoader {
    async parseMTL(url) {
        const response = await fetch(url);
        const text = await response.text();

        const materials = {};
        let material;

        const keywords = {
            newmtl(parts, unparsedArgs) {
                material = {};
                materials[unparsedArgs] = material;
            },
            /* eslint brace-style:0 */
            Ns(parts) { material.shininess = parseFloat(parts[0]); },
            Ka(parts) { material.ambient = parts.map(parseFloat); },
            Kd(parts) { material.diffuse = parts.map(parseFloat); },
            Ks(parts) { material.specular = parts.map(parseFloat); },
            Ke(parts) { material.emissive = parts.map(parseFloat); },
            Ni(parts) { material.opticalDensity = parseFloat(parts[0]); },
            d(parts) { material.opacity = parseFloat(parts[0]); },
            illum(parts) { material.illum = parseInt(parts[0]); },
        };



        const keywordRE = /(\w*)(?: )*(.*)/;
        const lines = text.split('\n');
        for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
            const line = lines[lineNo].trim();
            if (line === '' || line.startsWith('#')) {
                continue;
            }
            const m = keywordRE.exec(line);
            if (!m) {
                continue;
            }
            const [, keyword, unparsedArgs] = m;
            const parts = line.split(/\s+/).slice(1);
            const handler = keywords[keyword];
            if (!handler) {
                console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
                continue;
            }
            handler(parts, unparsedArgs);
        }

        return materials;
    }
}