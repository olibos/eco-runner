// This library was modified to support Big Endian values
// Converted to TypeScript

export interface StructField {
	name: string | null;
	byteLength: number;
	read: (v: DataView, offset: number) => unknown;
	structProperty: true;
}

export interface StructDef {
	byteLength: number;
	read: (v: DataView, offset: number) => any;
	readStructs(
		arrayBuffer: ArrayBuffer,
		offset: number,
		count: number,
		callback?: (s: any, offset: number) => void
	): any[];
	[key: string]: any;
}

// A type that has the minimum shape needed as an array element type descriptor
export type StructLike = { read: (v: DataView, offset: number) => unknown; byteLength: number };

export const Struct: {
	int8(name?: string, endian?: boolean): StructField;
	uint8(name?: string, endian?: boolean): StructField;
	int16(name?: string, endian?: boolean): StructField;
	uint16(name?: string, endian?: boolean): StructField;
	int32(name?: string, endian?: boolean): StructField;
	uint32(name?: string, endian?: boolean): StructField;
	float32(name?: string, endian?: boolean): StructField;
	float64(name?: string, endian?: boolean): StructField;
	string(name: string, length: number): StructField;
	array(name: string, type: StructLike, length: number): StructField;
	struct(name: string, struct: StructDef): StructField;
	skip(length: number): StructField;
	create(...args: Array<StructField | Record<string, unknown>>): StructDef;
	BIG_ENDIAN: false;
	LITTLE_ENDIAN: true;
} = {
	BIG_ENDIAN: false,
	LITTLE_ENDIAN: true,

	int8(name?: string, _endian?: boolean): StructField {
		return { name: name ?? null, byteLength: 1, read: (v, o) => v.getInt8(o), structProperty: true };
	},

	uint8(name?: string, _endian?: boolean): StructField {
		return { name: name ?? null, byteLength: 1, read: (v, o) => v.getUint8(o), structProperty: true };
	},

	int16(name?: string, endian?: boolean): StructField {
		return { name: name ?? null, byteLength: 2, read: (v, o) => v.getInt16(o, endian ?? false), structProperty: true };
	},

	uint16(name?: string, endian?: boolean): StructField {
		return { name: name ?? null, byteLength: 2, read: (v, o) => v.getUint16(o, endian ?? false), structProperty: true };
	},

	int32(name?: string, endian?: boolean): StructField {
		return { name: name ?? null, byteLength: 4, read: (v, o) => v.getInt32(o, endian ?? false), structProperty: true };
	},

	uint32(name?: string, endian?: boolean): StructField {
		return { name: name ?? null, byteLength: 4, read: (v, o) => v.getUint32(o, endian ?? false), structProperty: true };
	},

	float32(name?: string, endian?: boolean): StructField {
		return { name: name ?? null, byteLength: 4, read: (v, o) => v.getFloat32(o, endian ?? false), structProperty: true };
	},

	float64(name?: string, endian?: boolean): StructField {
		return { name: name ?? null, byteLength: 8, read: (v, o) => v.getFloat64(o, endian ?? false), structProperty: true };
	},

	string(name: string, length: number): StructField {
		return {
			name,
			byteLength: length,
			read(v, o) {
				let str = '';
				for (let j = 0; j < length; j++) {
					const char = v.getUint8(o + j);
					if (char === 0) break;
					str += String.fromCharCode(char);
				}
				return str;
			},
			structProperty: true,
		};
	},

	array(name: string, type: StructLike, length: number): StructField {
		return {
			name,
			byteLength: type.byteLength * length,
			read(v, o) {
				const aa = new Array(length);
				for (let j = 0; j < length; j++) {
					aa[j] = type.read(v, o);
					o += type.byteLength;
				}
				return aa;
			},
			structProperty: true,
		};
	},

	struct(name: string, struct: StructDef): StructField {
		return {
			name,
			byteLength: struct.byteLength,
			read: (v, o) => struct.read(v, o),
			structProperty: true,
		};
	},

	skip(length: number): StructField {
		return { name: null, byteLength: length, read: () => null, structProperty: true };
	},

	create(...args: Array<StructField | Record<string, unknown>>): StructDef {
		const lastArg = args[args.length - 1]!;
		const properties = (lastArg as StructField).structProperty ? {} : lastArg as PropertyDescriptorMap;

		const fields = args.filter((a): a is StructField => !!(a as StructField).structProperty);

		let byteLength = 0;
		for (const f of fields) byteLength += f.byteLength;

		const proto = Object.create(Object.prototype, properties);

		function readOne(v: DataView, offset: number): any {
			const st = Object.create(proto);
			let o = offset;
			for (const field of fields) {
				if (field.name !== null) st[field.name] = field.read(v, o);
				o += field.byteLength;
			}
			return st;
		}

		const struct: StructDef = {
			byteLength,
			read: readOne,
			readStructs(arrayBuffer: ArrayBuffer, offset: number, count: number, callback?: (s: any, offset: number) => void): any[] {
				const v = new DataView(arrayBuffer, offset);
				const a = new Array(count);
				for (let i = 0; i < count; i++) {
					const so = i * byteLength;
					const s = readOne(v, so);
					if (callback) callback(s, offset + so);
					a[i] = s;
				}
				return a;
			},
		};

		return struct;
	},
};
