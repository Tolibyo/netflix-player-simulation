import fs from 'fs';
import path from 'path';

export type Segment = { uri: string; durationSec: number };
export type Rendition = { bitrateKbps: number; segments: Segment[] };

export type ParsedManifest = {
  format: 'HLS' | 'DASH';
  renditions: Rendition[];
};

function readJson(p: string): any {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  const raw = fs.readFileSync(abs, 'utf-8');
  return JSON.parse(raw);
}

export function parseManifest(p: string): ParsedManifest {
  const data = readJson(p);
  if (data.format !== 'HLS' && data.format !== 'DASH') {
    throw new Error('unknown manifest format');
  }

  // HLS JSON shape: { format:'HLS', renditions:[{bitrateKbps, segments:[{uri,durationSec}]}] }
  if (data.format === 'HLS') {
    if (!Array.isArray(data.renditions)) throw new Error('HLS: renditions must be an array');
    for (const r of data.renditions) {
      if (typeof r.bitrateKbps !== 'number') throw new Error('HLS: bitrateKbps missing');
      if (!Array.isArray(r.segments)) throw new Error('HLS: segments must be an array');
      for (const s of r.segments) {
        if (typeof s.uri !== 'string') throw new Error('HLS: segment uri missing');
        if (typeof s.durationSec !== 'number') throw new Error('HLS: segment durationSec missing');
      }
    }
    return { format: 'HLS', renditions: data.renditions as Rendition[] };
  }

  // DASH JSON shape: { format:'DASH', representations:[{bandwidthKbps, parts:[{url, durSec}]}] }
  if (!Array.isArray(data.representations)) throw new Error('DASH: representations must be an array');
  const renditions: Rendition[] = data.representations.map((rep: any) => {
    if (typeof rep.bandwidthKbps !== 'number') throw new Error('DASH: bandwidthKbps missing');
    if (!Array.isArray(rep.parts)) throw new Error('DASH: parts must be an array');
    const segments: Segment[] = rep.parts.map((p: any) => {
      if (typeof p.url !== 'string') throw new Error('DASH: part url missing');
      if (typeof p.durSec !== 'number') throw new Error('DASH: part durSec missing');
      return { uri: p.url, durationSec: p.durSec };
    });
    return { bitrateKbps: rep.bandwidthKbps, segments };
  });

  return { format: 'DASH', renditions };
}
