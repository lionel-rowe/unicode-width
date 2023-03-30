import { assertEquals } from 'https://deno.land/std@0.180.0/testing/asserts.ts'

const rs = await (await fetch('https://raw.githubusercontent.com/unicode-rs/unicode-width/master/src/tables.rs')).text()

function runLengthEncode(arr: number[]) {
	const data: number[] = []
	const runLengths: number[] = []

	let prev: symbol | number = Symbol('none')

	for (const x of arr) {
		if (x === prev) {
			++runLengths[runLengths.length - 1]
		} else {
			prev = x
			data.push(x)
			runLengths.push(1)
		}
	}

	return { d: btoa(String.fromCharCode(...data)), r: btoa(String.fromCharCode(...runLengths)) }
}

const data = {
	UNICODE_VERSION: rs
		.match(/pub const UNICODE_VERSION: \(u8, u8, u8\) = \((\d+), (\d+), (\d+)\);/)!
		.slice(1)
		.map(Number),
	tables: [] as ReturnType<typeof runLengthEncode>[],
}

for (const x of [...rs.matchAll(/static TABLES_(\d): \[u8; \d+\] = (\[\s*(?:\d\w*\s*(?:,\s*)?)+\s*\])\s*;/g)]) {
	eval(`data.tables[${x[1]}] = ${runLengthEncode.name}(${x[2]})`)
}

assertEquals(data.UNICODE_VERSION.length, 3)
assertEquals(data.tables.length, 3)

await Deno.writeTextFile('./data.json', JSON.stringify(data))
