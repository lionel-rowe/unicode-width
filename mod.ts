import data from './data.json' assert { type: 'json' }

const runLengthDecode = ({ d, r }: { d: string; r: string }) => {
	const data = atob(d)
	const runLengths = atob(r)
	let out = ''

	for (const [i, ch] of [...runLengths].entries()) {
		out += data[i].repeat(ch.codePointAt(0)!)
	}

	return Uint8Array.from([...out].map((x) => x.codePointAt(0)!))
}

const tableCache = new Map<string, Uint8Array>()
const tables = new Proxy(data.tables, {
	get(t, _k) {
		const k = _k as `${number}`
		if (tableCache.has(k)) return tableCache.get(k)
		const v = runLengthDecode(t[k])
		tableCache.set(k, v)
		return v
	},
}) as unknown as Uint8Array[]

function lookupWidth(cp: number, isCjk: boolean) {
	const t1Offset = tables[0][(cp >> 13) & 0xff]
	const t2Offset = tables[1][128 * t1Offset + ((cp >> 6) & 0x7f)]
	const packedWidths = tables[2][16 * t2Offset + ((cp >> 2) & 0xf)]

	const width = (packedWidths >> (2 * (cp & 0b11))) & 0b11

	if (width === 3) {
		return isCjk ? 2 : 1
	} else {
		return width
	}
}

function _width(ch: string, isCjk: boolean) {
	const cp = ch.codePointAt(0)!

	if (cp < 0x7f) {
		return cp >= 0x20 ? 1 : cp === 0 ? 0 : null
	} else if (cp >= 0xa0) {
		return lookupWidth(cp, isCjk)
	} else {
		return null
	}
}

const charCache = new Map<string, number | null>()
const cjkCache = new Map<string, number | null>()
function width(ch: string, isCjk: boolean) {
	const cache = isCjk ? charCache : cjkCache
	if (cache.has(ch)) return cache.get(ch)
	const v = _width(ch, isCjk)
	cache.set(ch, v)
	return v
}

export function stringWidth(str: string) {
	return unicodeWidth(stripAnsi(str))
}

export function unicodeWidth(str: string, isCjk = false) {
	return [...str].map((ch) => width(ch, isCjk) ?? 0).reduce((a, b) => a + b, 0)
}

export function stripAnsi(str: string) {
	return str.replaceAll(
		// deno-lint-ignore no-control-regex
		/[\x1B\x9B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\x07)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
		'',
	)
}
