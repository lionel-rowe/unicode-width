import { assert, assertEquals } from 'https://deno.land/std@0.180.0/testing/asserts.ts'
import * as mod from '../mod.ts'
import { unicodeWidth } from '../mod.ts'
import fc from 'https://esm.sh/fast-check@3.8.0'

Deno.test('unicodeWidth', async (t) => {
	await t.step('ASCII', () => {
		const lorem =
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'

		assertEquals(unicodeWidth(lorem), lorem.length)
	})

	await t.step('CJK', () => {
		const qianZiWen =
			'天地玄黃宇宙洪荒日月盈昃辰宿列張寒來暑往秋收冬藏閏餘成歲律呂調陽雲騰致雨露結爲霜金生麗水玉出崑岡劍號巨闕珠稱夜光果珍李柰菜重芥薑海鹹河淡鱗潛羽翔龍師火帝鳥官人皇始制文字乃服衣裳推位讓國有虞陶唐弔民伐罪周發殷湯坐朝問道垂拱平章愛育黎首臣伏戎羌遐邇壹體率賓歸王鳴鳳在樹白駒食場化被草木賴及萬方蓋此身髮四大五常恭惟鞠養豈敢毀傷女慕貞絜男效才良知過必改得能莫忘罔談彼短靡恃己長信使可覆器欲難量墨悲絲淬詩讚羔羊'

		assertEquals(unicodeWidth(qianZiWen), qianZiWen.length * 2)
	})

	await t.step('normalization', async (t) => {
		const str = 'á'

		await t.step('NFC', () => {
			const nfc = str.normalize('NFC')

			assertEquals(nfc.length, 1)
			assertEquals(unicodeWidth(nfc), 1)
		})

		await t.step('NFD', () => {
			const nfd = str.normalize('NFD')

			assertEquals(nfd.length, 2)
			assertEquals(unicodeWidth(nfd), 1)
		})
	})
})

Deno.test('docs', async (t) => {
	const code = await (await fetch(import.meta.resolve('../README.md'))).text()

	const codeBlocks = [...code.matchAll(/(?<=```\w*)[\s\S]+?(?=```)/g)].map((x) => x[0])

	assert(codeBlocks.length)
	assert(codeBlocks.length === [...code.matchAll(/```/g)].length / 2)

	for (const codeBlock of codeBlocks) {
		const expressions = codeBlock
			.split('\n')
			.filter((line) => /[^/]+.+\/\//.test(line))
			.map((line) => line.split(/\/\/\s*=>\s*/))

		assert(expressions.length)

		for (const x of expressions) {
			assert(x.length === 2)
			const [expression, expectedResult] = x.map((x) => x.trim())

			for (const [k, v] of Object.entries(mod)) {
				// deno-lint-ignore no-explicit-any no-extra-semi
				;(globalThis as any)[k] = v
			}

			await t.step(`${expression} == ${expectedResult}`, () => {
				assertEquals(eval(expression), eval(expectedResult))
			})
		}
	}
})

Deno.test('property-testing equality with unicode-width Rust crate', async (t) => {
	const libPath = './unicode_width_crate/target/debug/libunicode_width_crate.so'

	// @ts-ignore type-check errors if unavailable due to lack of --unstable flag
	let dylib: Deno.DynamicLibrary<{
		unicode_width: {
			parameters: ['buffer']
			result: 'usize'
		}
	}>

	try {
		if ((await Deno.permissions.query({ name: 'ffi' })).state !== 'granted')
			throw new Error('FFI permission not granted')
		if (eval(`Deno.dlopen`) == null) throw new Error('Deno.dlopen not available')

		await Deno.stat(libPath)

		// @ts-ignore type-check errors if unavailable due to lack of --unstable flag
		dylib = Deno.dlopen(libPath, {
			unicode_width: { parameters: ['buffer'], result: 'usize' },
		})

		const toCString = (str: string) => new TextEncoder().encode(str + '\0')

		for (const arbitrary of ['string', 'unicodeString', 'fullUnicodeString'] as const) {
			await t.step(`fc.${arbitrary}()`, () => {
				fc.assert(
					fc.property(
						fc[arbitrary](),
						// JSON stringify to allow any null characters to cross the FFI boundary in a null-terminated string
						(str) => unicodeWidth(str) === dylib.symbols.unicode_width(toCString(JSON.stringify(str))),
					),
				)
			})
		}
	} catch (e) {
		console.info(`%cSkipping FFI tests for unicode-width. Reason: ${e.message}`, 'font-style: italic')
	} finally {
		// deno-lint-ignore no-extra-non-null-assertion
		dylib!?.close()
	}
})
