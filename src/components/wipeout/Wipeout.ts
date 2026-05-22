import {
	BufferAttribute,
	BufferGeometry,
	CanvasTexture,
	Color,
	DoubleSide,
	FrontSide,
	LinearSRGBColorSpace,
	Mesh,
	MeshBasicMaterial,
	NearestFilter,
	Object3D,
	PerspectiveCamera,
	PlaneGeometry,
	Scene,
	Vector2,
	Vector3,
	WebGLRenderer,
} from 'three';
import type { Side } from 'three';

import { HermiteCurve3 } from './HermiteCurve3';
import { Struct } from './Struct';

// ----------------------------------------------------------------------------
// Internal types

interface MaterialSet {
	materials: MeshBasicMaterial[];
	flatMaterialIndex: number;
}

// PerspectiveCamera extended with spline-camera state
type SplineCamera = PerspectiveCamera & { currentLookAt: Vector3; roll: number };

interface TrackEntry {
	path: string;
	name: string;
	hasTEXFile?: boolean;
}

// Represents a triangle batch to emit into a BufferGeometry
interface TriBatch {
	positions: number[];
	colors: number[];
	uvs: number[];
	materialIndex: number;
}

// ----------------------------------------------------------------------------
// Wipeout Data Types (built with Struct)

const TrackVertex = Struct.create(
	Struct.int32('x'),
	Struct.int32('y'),
	Struct.int32('z'),
	Struct.int32('padding'),
);

const TrackFace = Struct.create(
	Struct.array('indices', Struct.uint16(), 4),
	Struct.int16('normalx'),
	Struct.int16('normaly'),
	Struct.int16('normalz'),
	Struct.uint8('tile'),
	Struct.uint8('flags'),
	Struct.uint32('color'),
);

const TrackFaceFlags = {
	WALL: 0,
	TRACK: 1,
	WEAPON: 2,
	FLIP: 4,
	WEAPON_2: 8,
	UNKNOWN: 16,
	BOOST: 32,
} as const;

const TrackTextureIndex = Struct.create(
	Struct.array('near', Struct.uint16(), 16), // 4×4 tiles
	Struct.array('med', Struct.uint16(), 4),   // 2×2 tiles
	Struct.array('far', Struct.uint16(), 1),   // 1 tile
);

const TrackSection = Struct.create(
	Struct.int32('nextJunction'),
	Struct.int32('previous'),
	Struct.int32('next'),
	Struct.int32('x'),
	Struct.int32('y'),
	Struct.int32('z'),
	Struct.skip(116),
	Struct.uint32('firstFace'),
	Struct.uint16('numFaces'),
	Struct.skip(4),
	Struct.uint16('flags'),
	Struct.skip(4),
);

const TrackSectionFlags = {
	JUMP: 1,
	JUNCTION_END: 8,
	JUNCTION_START: 16,
	JUNCTION: 32,
} as const;

const TrackTexture = Struct.create(
	Struct.uint8('tile'),
	Struct.uint8('flags'),
);

// .PRM structs
const WVector3 = Struct.create(
	Struct.int32('x'),
	Struct.int32('y'),
	Struct.int32('z'),
);

const Vertex = Struct.create(
	Struct.int16('x'),
	Struct.int16('y'),
	Struct.int16('z'),
	Struct.int16('padding'),
);

const UV = Struct.create(
	Struct.uint8('u'),
	Struct.uint8('v'),
);

const ObjectHeader = Struct.create(
	Struct.string('name', 15),
	Struct.skip(1),
	Struct.uint16('vertexCount'),
	Struct.skip(14),
	Struct.uint16('polygonCount'),
	Struct.skip(20),
	Struct.uint16('index1'),
	Struct.skip(28),
	Struct.struct('origin', WVector3),
	Struct.skip(20),
	Struct.struct('position', WVector3),
	Struct.skip(16),
);

const POLYGON_TYPE = {
	UNKNOWN_00: 0x00,
	FLAT_TRIS_FACE_COLOR: 0x01,
	TEXTURED_TRIS_FACE_COLOR: 0x02,
	FLAT_QUAD_FACE_COLOR: 0x03,
	TEXTURED_QUAD_FACE_COLOR: 0x04,
	FLAT_TRIS_VERTEX_COLOR: 0x05,
	TEXTURED_TRIS_VERTEX_COLOR: 0x06,
	FLAT_QUAD_VERTEX_COLOR: 0x07,
	TEXTURED_QUAD_VERTEX_COLOR: 0x08,
	SPRITE_TOP_ANCHOR: 0x0A,
	SPRITE_BOTTOM_ANCHOR: 0x0B,
} as const;

const PolygonHeader = Struct.create(
	Struct.uint16('type'),
	Struct.uint16('subtype'),
);

const Polygon: Record<number, any> = {};
Polygon[POLYGON_TYPE.UNKNOWN_00] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.array('unknown', Struct.uint16(), 7),
);
Polygon[POLYGON_TYPE.FLAT_TRIS_FACE_COLOR] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.array('indices', Struct.uint16(), 3),
	Struct.uint16('unknown'),
	Struct.uint32('color'),
);
Polygon[POLYGON_TYPE.TEXTURED_TRIS_FACE_COLOR] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.array('indices', Struct.uint16(), 3),
	Struct.uint16('texture'),
	Struct.array('unknown', Struct.uint16(), 2),
	Struct.array('uv', UV, 3),
	Struct.array('unknown2', Struct.uint16(), 1),
	Struct.uint32('color'),
);
Polygon[POLYGON_TYPE.FLAT_QUAD_FACE_COLOR] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.array('indices', Struct.uint16(), 4),
	Struct.uint32('color'),
);
Polygon[POLYGON_TYPE.TEXTURED_QUAD_FACE_COLOR] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.array('indices', Struct.uint16(), 4),
	Struct.uint16('texture'),
	Struct.array('unknown', Struct.uint16(), 2),
	Struct.array('uv', UV, 4),
	Struct.array('unknown2', Struct.uint16(), 1),
	Struct.uint32('color'),
);
Polygon[POLYGON_TYPE.FLAT_TRIS_VERTEX_COLOR] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.array('indices', Struct.uint16(), 3),
	Struct.uint16('unknown'),
	Struct.array('colors', Struct.uint32(), 3),
);
Polygon[POLYGON_TYPE.TEXTURED_TRIS_VERTEX_COLOR] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.array('indices', Struct.uint16(), 3),
	Struct.uint16('texture'),
	Struct.array('unknown', Struct.uint16(), 2),
	Struct.array('uv', UV, 3),
	Struct.array('unknown2', Struct.uint16(), 1),
	Struct.array('colors', Struct.uint32(), 3),
);
Polygon[POLYGON_TYPE.FLAT_QUAD_VERTEX_COLOR] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.array('indices', Struct.uint16(), 4),
	Struct.array('colors', Struct.uint32(), 4),
);
Polygon[POLYGON_TYPE.TEXTURED_QUAD_VERTEX_COLOR] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.array('indices', Struct.uint16(), 4),
	Struct.uint16('texture'),
	Struct.array('unknown', Struct.uint16(), 2),
	Struct.array('uv', UV, 4),
	Struct.array('unknown2', Struct.uint8(), 2),
	Struct.array('colors', Struct.uint32(), 4),
);
Polygon[POLYGON_TYPE.SPRITE_TOP_ANCHOR] = Struct.create(
	Struct.struct('header', PolygonHeader),
	Struct.uint16('index'),
	Struct.uint16('width'),
	Struct.uint16('height'),
	Struct.uint16('texture'),
	Struct.uint32('color'),
);
Polygon[POLYGON_TYPE.SPRITE_BOTTOM_ANCHOR] = Polygon[POLYGON_TYPE.SPRITE_TOP_ANCHOR];

// .TIM image types
const IMAGE_TYPE = {
	PALETTED_4_BPP: 0x08,
	PALETTED_8_BPP: 0x09,
	TRUE_COLOR_16_BPP: 0x02,
} as const;

const ImageFileHeader = Struct.create(
	Struct.uint32('magic', Struct.LITTLE_ENDIAN),
	Struct.uint32('type', Struct.LITTLE_ENDIAN),
	Struct.uint32('headerLength', Struct.LITTLE_ENDIAN),
	Struct.uint16('paletteX', Struct.LITTLE_ENDIAN),
	Struct.uint16('paletteY', Struct.LITTLE_ENDIAN),
	Struct.uint16('paletteColors', Struct.LITTLE_ENDIAN),
	Struct.uint16('palettes', Struct.LITTLE_ENDIAN),
);

const ImagePixelHeader = Struct.create(
	Struct.uint16('skipX', Struct.LITTLE_ENDIAN),
	Struct.uint16('skipY', Struct.LITTLE_ENDIAN),
	Struct.uint16('width', Struct.LITTLE_ENDIAN),
	Struct.uint16('height', Struct.LITTLE_ENDIAN),
);

// ----------------------------------------------------------------------------
// Helper: build a BufferGeometry from an ordered list of triangle batches,
// grouping consecutive batches with the same materialIndex together.

function buildBufferGeometry(batches: TriBatch[]): BufferGeometry | null {
	if (batches.length === 0) return null;

	const allPos: number[] = [];
	const allCol: number[] = [];
	const allUV: number[] = [];

	let currentMaterial = -1;
	let groupStart = 0;
	let vertexCount = 0;

	const geometry = new BufferGeometry();

	const flush = () => {
		if (currentMaterial >= 0 && vertexCount > groupStart) {
			geometry.addGroup(groupStart, vertexCount - groupStart, currentMaterial);
		}
	};

	for (const batch of batches) {
		if (batch.materialIndex !== currentMaterial) {
			flush();
			groupStart = vertexCount;
			currentMaterial = batch.materialIndex;
		}
		for (const v of batch.positions) allPos.push(v);
		for (const v of batch.colors) allCol.push(v);
		for (const v of batch.uvs) allUV.push(v);
		vertexCount += 3;
	}
	flush();

	geometry.setAttribute('position', new BufferAttribute(new Float32Array(allPos), 3));
	geometry.setAttribute('color', new BufferAttribute(new Float32Array(allCol), 3));
	geometry.setAttribute('uv', new BufferAttribute(new Float32Array(allUV), 2));
	return geometry;
}

// ----------------------------------------------------------------------------
// Main Wipeout class

export class Wipeout {
	loaded = false;
	renderer: WebGLRenderer;
	container: HTMLElement;
	width: number;
	height: number;

	prevTime!: number;
	scene!: Scene;
	sprites!: Object3D[];
	//camera!: PerspectiveCamera;
	splineCamera!: SplineCamera;

	cameraSpline: HermiteCurve3 | null = null;
	sceneMaterial: MaterialSet | null = null;
	trackMaterial: MaterialSet | null = null;
	weaponTileMaterial: MeshBasicMaterial | null = null;

	ticks = 0;
	#animationId: number | null = null;

	constructor(container: string | HTMLElement | null, width: number, height: number) {
		this.renderer = new WebGLRenderer({ antialias: true });
		this.renderer.outputColorSpace = LinearSRGBColorSpace;
		this.renderer.setSize(width, height);
		this.renderer.setClearColor(0x000000);

		if (typeof container === 'string') container = document.getElementById(container);
		if (!container) throw new Error(`Container not found`);
		this.container = container;
		this.container.appendChild(this.renderer.domElement);

		this.width = width;
		this.height = height;

		window.addEventListener('resize', this.resize.bind(this), true);
		this.clear();
		this.animate = this.animate.bind(this);
	}

	dispose(){
		this.clear();
		this.container.removeChild(this.renderer.domElement);
	}
	clear(): void {
		this.loaded = false;
		if (this.#animationId){
			cancelAnimationFrame(this.#animationId);
			this.#animationId = null;
		}

		this.prevTime = performance.now();
		this.scene = new Scene();
		this.sprites = [];

		// Spline camera
		const splineCam = new PerspectiveCamera(84, window.innerWidth / window.innerHeight, 64, 2048576) as SplineCamera;
		splineCam.currentLookAt = new Vector3(0, 0, 0);
		splineCam.roll = 0;
		splineCam.rotation.order = 'YZX';
		this.splineCamera = splineCam;

		this.cameraSpline = null;
		this.sceneMaterial = null;
		this.trackMaterial = null;
		this.weaponTileMaterial = null;

		this.ticks = 0;
	}

	resize(): void {
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.splineCamera.aspect = this.width / this.height;
		this.splineCamera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	animate(time = 0): void {
		this.#animationId = requestAnimationFrame(this.animate);
		if (!this.loaded) return;

		if (this.weaponTileMaterial) {
			this.updateWeaponMaterial(time);
		}

		const elapsedTicks = time / 1000 * 60;
		if (time === 0){
			this.ticks = elapsedTicks; // Avoid big jump on first frame when time=0
		}

		while (this.ticks < elapsedTicks) {
			this.updateSplineCamera();
			this.ticks++;
		}

		this.rotateSpritesToCamera(this.splineCamera);
		this.renderer.render(this.scene, this.splineCamera);
	}

	updateSplineCamera(): void {
		const spline = this.cameraSpline!;
		const damping = 0.90;
		const time = this.ticks * 1000 / 60;

		const loopTime = spline.points.length * 100;

		// Camera position along the spline
		const tmod = (time % loopTime) / loopTime;
		const cameraPos = spline.getPointAt(tmod).clone();
		this.splineCamera.position.multiplyScalar(damping)
			.add(cameraPos.clone().add(new Vector3(0, 600, 0)).multiplyScalar(1 - damping));

		// Camera lookAt along the spline
		const tmodLookAt = ((time + 800) % loopTime) / loopTime;
		const lookAtPos = spline.getPointAt(tmodLookAt).clone();
		this.splineCamera.currentLookAt = this.splineCamera.currentLookAt.multiplyScalar(damping)
			.add(lookAtPos.clone().multiplyScalar(1 - damping));
		this.splineCamera.lookAt(this.splineCamera.currentLookAt);

		// Roll into corners
		const cn = cameraPos.sub(this.splineCamera.position);
		const tn = lookAtPos.sub(this.splineCamera.currentLookAt);
		let roll = Math.atan2(cn.z, cn.x) - Math.atan2(tn.z, tn.x);
		roll += roll > Math.PI ? -Math.PI * 2 : roll < -Math.PI ? Math.PI * 2 : 0;

		this.splineCamera.roll = this.splineCamera.roll * 0.95 + roll * 0.1;
		this.splineCamera.up = new Vector3(0, 1, 0).applyAxisAngle(
			this.splineCamera.position.clone().sub(this.splineCamera.currentLookAt).normalize(),
			this.splineCamera.roll * 0.25,
		);
	}

	rotateSpritesToCamera(camera: PerspectiveCamera): void {
		for (const sprite of this.sprites) {
			sprite.rotation.y = camera.rotation.y;
		}
	}

	updateWeaponMaterial(time: number): void {
		// Purple → blue → cyan → yellow → amber (never 100% red or green)
		const colors = [0x800080, 0x0000ff, 0x00ffff, 0xffff00, 0xff8000];
		const t = time / 1050;
		const index = Math.floor(t);
		const alpha = t - index;

		const colorA = new Color(colors[index % colors.length]);
		const colorB = new Color(colors[(index + 1) % colors.length]);
		this.weaponTileMaterial!.color = colorA.lerp(colorB, alpha).multiplyScalar(1.5);
	}

	// ----------------------------------------------------------------------------
	// Utility: load binary data via fetch

	async loadBinary(url: string, callback: (buffer: ArrayBuffer) => void): Promise<void> {
		await fetch(url)
			.then(r => r.arrayBuffer())
			.then(callback);
	}

	loadBinaries(urls: Record<string, string>, callback: (files: Record<string, ArrayBuffer>) => void): Promise<void> {
		const entries = Object.entries(urls);
		return Promise.all(entries.map(([, url]) => fetch(url).then(r => r.arrayBuffer())))
			.then(buffers => {
				const files: Record<string, ArrayBuffer> = {};
				entries.forEach(([key], i) => { files[key] = buffers[i]!; });
				callback(files);
			});
	}

	int32ToColor(v: number): Color {
		return new Color(
			((v >> 24) & 0xff) / 0x80,
			((v >> 16) & 0xff) / 0x80,
			((v >> 8) & 0xff) / 0x80,
		);
	}

	// ----------------------------------------------------------------------------
	// Read 3D Objects from a PRM File

	readObjects(buffer: ArrayBuffer): any[] {
		let offset = 0;
		const objects: any[] = [];
		while (offset < buffer.byteLength) {
			const object = this.readObject(buffer, offset);
			offset += object.byteLength;
			objects.push(object);
		}
		return objects;
	}

	readObject(buffer: ArrayBuffer, offset: number): any {
		const initialOffset = offset;

		const header = ObjectHeader.readStructs(buffer, offset, 1)[0];
		offset += ObjectHeader.byteLength;

		const vertices = Vertex.readStructs(buffer, offset, header.vertexCount);
		offset += Vertex.byteLength * header.vertexCount;

		const polygons: any[] = [];
		for (let i = 0; i < header.polygonCount; i++) {
			const polygonHeader = PolygonHeader.readStructs(buffer, offset, 1)[0];
			const PolygonType = Polygon[polygonHeader.type];
			const polygon = PolygonType.readStructs(buffer, offset, 1)[0];
			offset += PolygonType.byteLength;
			polygons.push(polygon);
		}

		return { header, vertices, polygons, byteLength: offset - initialOffset };
	}

	// ----------------------------------------------------------------------------
	// Create a Three.js model from a single PRM 3D object.
	//
	// Replaces legacy THREE.Geometry + THREE.Face3 + THREE.MeshFaceMaterial with
	// BufferGeometry (one vertex per triangle corner, groups per material index).

	createModelFromObject(object: any): Object3D {
		const model = new Object3D();
		model.position.set(
			object.header.position.x,
			-object.header.position.y,
			-object.header.position.z,
		);

		// Build a flat vertex array for easy sprite index lookups
		const vertices: Vector3[] = (object.vertices as any[]).map((v: any) =>
			new Vector3(v.x, -v.y, -v.z),
		);

		const whiteColor = new Color(1, 1, 1);
		const nullUV = new Vector2(0, 0);
		const batches: TriBatch[] = [];

		const emit = (
			i0: number, i1: number, i2: number,
			c0: Color, c1: Color, c2: Color,
			uv0: Vector2, uv1: Vector2, uv2: Vector2,
			materialIndex: number,
		) => {
			const v0 = vertices[i0]!;
			const v1 = vertices[i1]!;
			const v2 = vertices[i2]!;
			batches.push({
				materialIndex,
				positions: [v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z],
				colors:    [c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, c2.r, c2.g, c2.b],
				uvs:       [uv0.x, uv0.y, uv1.x, uv1.y, uv2.x, uv2.y],
			});
		};

		const mat = this.sceneMaterial!;

		for (const p of object.polygons as any[]) {
			// Sprite polygons
			if (
				p.header.type === POLYGON_TYPE.SPRITE_BOTTOM_ANCHOR ||
				p.header.type === POLYGON_TYPE.SPRITE_TOP_ANCHOR
			) {
				const v = vertices[p.index]!;
				const color = this.int32ToColor(p.color);
				const yOffset = p.header.type === POLYGON_TYPE.SPRITE_BOTTOM_ANCHOR
					? p.height / 2
					: -p.height / 2;

				const spriteMat = new MeshBasicMaterial({
					map: mat.materials[p.texture]?.map ?? null,
					color,
					alphaTest: 0.5,
				});
				const spriteMesh = new Mesh(new PlaneGeometry(p.width, p.height), spriteMat);
				const sprite = new Object3D();
				sprite.position.set(v.x, v.y + yOffset, v.z);
				sprite.add(spriteMesh);
				model.add(sprite);
				this.sprites.push(sprite);
				continue;
			}

			// Triangle / Quad polygons
			if (!p.indices) continue;

			let materialIndex = mat.flatMaterialIndex;
			const c: Color[] = [whiteColor, whiteColor, whiteColor, whiteColor];
			const uv: Vector2[] = [nullUV, nullUV, nullUV, nullUV];

			if (typeof p.texture !== 'undefined') {
				materialIndex = p.texture;
				const img = mat.materials[materialIndex]?.map?.image as HTMLCanvasElement | undefined;
				if (img) {
					for (let j = 0; j < p.uv.length; j++) {
						uv[j] = new Vector2(p.uv[j].u / img.width, 1 - p.uv[j].v / img.height);
					}
				}
			}

			if (p.color !== undefined || p.colors) {
				for (let j = 0; j < p.indices.length; j++) {
					c[j] = this.int32ToColor(p.color ?? p.colors[j]);
				}
			}

			// Emit triangle (original winding: 2, 1, 0)
			emit(p.indices[2], p.indices[1], p.indices[0],
				c[2]!, c[1]!, c[0]!, uv[2]!, uv[1]!, uv[0]!, materialIndex);

			// Extra triangle for quads (winding: 2, 3, 1)
			if (p.indices.length === 4) {
				emit(p.indices[2], p.indices[3], p.indices[1],
					c[2]!, c[3]!, c[1]!, uv[2]!, uv[3]!, uv[1]!, materialIndex);
			}
		}

		const geometry = buildBufferGeometry(batches);
		if (geometry) {
			model.add(new Mesh(geometry, mat.materials));
		}
		return model;
	}

	// ----------------------------------------------------------------------------
	// Unpack TIM images from a compressed CMP file (LZ77)

	unpackImages(buffer: ArrayBuffer): ArrayBuffer[] {
		const data = new DataView(buffer);
		const numberOfFiles = data.getUint32(0, true);
		const packedDataOffset = (numberOfFiles + 1) * 4;

		let unpackedLength = 0;
		for (let i = 0; i < numberOfFiles; i++) {
			unpackedLength += data.getUint32((i + 1) * 4, true);
		}

		const src = new Uint8Array(buffer, packedDataOffset);
		const dst = new Uint8Array(unpackedLength);
		const wnd = new Uint8Array(0x2000);

		let srcPos = 0, dstPos = 0, wndPos = 1;
		let curByte = 0, bitMask = 0x80;

		const readBitfield = (size: number): number => {
			let value = 0;
			while (size > 0) {
				if (bitMask === 0x80) curByte = src[srcPos++]!;
				if (curByte & bitMask) value |= size;
				size >>= 1;
				bitMask >>= 1;
				if (bitMask === 0) bitMask = 0x80;
			}
			return value;
		};

		while (true) {
			if (srcPos > src.byteLength || dstPos > unpackedLength) break;

			if (bitMask === 0x80) curByte = src[srcPos++]!;
			const curBit = curByte & bitMask;
			bitMask >>= 1;
			if (bitMask === 0) bitMask = 0x80;

			if (curBit) {
				wnd[wndPos & 0x1fff] = dst[dstPos] = readBitfield(0x80);
				wndPos++; dstPos++;
			} else {
				const position = readBitfield(0x1000);
				if (position === 0) break;
				const length = readBitfield(0x08) + 2;
				for (let i = 0; i <= length; i++) {
					wnd[wndPos & 0x1fff] = dst[dstPos] = wnd[(i + position) & 0x1fff]!;
					wndPos++; dstPos++;
				}
			}
		}

		let fileOffset = 0;
		const files: ArrayBuffer[] = [];
		for (let i = 0; i < numberOfFiles; i++) {
			const fileLength = data.getUint32((i + 1) * 4, true);
			files.push(dst.buffer.slice(fileOffset, fileOffset + fileLength));
			fileOffset += fileLength;
		}
		return files;
	}

	// ----------------------------------------------------------------------------
	// Render a TIM image into a 2D canvas

	readImage(buffer: ArrayBuffer): HTMLCanvasElement {
		const data = new DataView(buffer);
		const file = ImageFileHeader.readStructs(buffer, 0, 1)[0];
		let offset = ImageFileHeader.byteLength;

		let palette: Uint16Array | null = null;
		if (file.type === IMAGE_TYPE.PALETTED_4_BPP || file.type === IMAGE_TYPE.PALETTED_8_BPP) {
			palette = new Uint16Array(buffer, offset, file.paletteColors);
			offset += file.paletteColors * 2;
		}
		offset += 4; // skip data size

		let pixelsPerShort = 1;
		if (file.type === IMAGE_TYPE.PALETTED_8_BPP) pixelsPerShort = 2;
		else if (file.type === IMAGE_TYPE.PALETTED_4_BPP) pixelsPerShort = 4;

		const dim = ImagePixelHeader.readStructs(buffer, offset, 1)[0];
		offset += ImagePixelHeader.byteLength;

		const width = dim.width * pixelsPerShort;
		const height = dim.height;

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d')!;
		const pixels = ctx.createImageData(width, height);

		const putPixel = (dst: Uint8ClampedArray, off: number, color: number) => {
			dst[off + 0] = (color & 0x1f) << 3;         // R
			dst[off + 1] = ((color >> 5) & 0x1f) << 3;  // G
			dst[off + 2] = ((color >> 10) & 0x1f) << 3; // B
			dst[off + 3] = color === 0 ? 0 : 0xff;       // A
		};

		const entries = dim.width * dim.height;
		if (file.type === IMAGE_TYPE.TRUE_COLOR_16_BPP) {
			for (let i = 0; i < entries; i++) {
				putPixel(pixels.data, i * 4, data.getUint16(offset + i * 2, true));
			}
		} else if (file.type === IMAGE_TYPE.PALETTED_8_BPP) {
			for (let i = 0; i < entries; i++) {
				const p = data.getUint16(offset + i * 2, true);
				putPixel(pixels.data, i * 8 + 0, palette![p & 0xff]!);
				putPixel(pixels.data, i * 8 + 4, palette![(p >> 8) & 0xff]!);
			}
		} else if (file.type === IMAGE_TYPE.PALETTED_4_BPP) {
			for (let i = 0; i < entries; i++) {
				const p = data.getUint16(offset + i * 2, true);
				putPixel(pixels.data, i * 16 + 0,  palette![p & 0xf]!);
				putPixel(pixels.data, i * 16 + 4,  palette![(p >> 4) & 0xf]!);
				putPixel(pixels.data, i * 16 + 8,  palette![(p >> 8) & 0xf]!);
				putPixel(pixels.data, i * 16 + 12, palette![(p >> 12) & 0xf]!);
			}
		}

		ctx.putImageData(pixels, 0, 0);
		return canvas;
	}

	// ----------------------------------------------------------------------------
	// Create an array of MeshBasicMaterials from canvas images.
	// Replaces legacy THREE.MeshFaceMaterial; callers use the materials array directly.
	// - vertexColors: enables per-vertex colour on materials (true for both old
	//   FaceColors and VertexColors modes)
	// - side: FrontSide for scene objects, DoubleSide for track
	// Index 3 with DoubleSide is the weapon tile whose colour is animated.

	createMeshFaceMaterial(images: HTMLCanvasElement[], vertexColors: boolean, side: Side): MaterialSet {
		const materials: MeshBasicMaterial[] = [];
		const basicMaterial = new MeshBasicMaterial({ wireframe: false, vertexColors });

		for (let i = 0; i < images.length; i++) {
			// CanvasTexture replaces new THREE.Texture(canvas) + texture.needsUpdate = true
			const texture = new CanvasTexture(images[i]!);
			texture.minFilter = NearestFilter;
			texture.magFilter = NearestFilter;

			const material = new MeshBasicMaterial({ map: texture, side, alphaTest: 0.5 });

			// Weapon tile (track material, index 3): animated colour, no vertex colours
			if (i === 3 && side === DoubleSide) {
				material.vertexColors = false;
				this.weaponTileMaterial = material;
			} else {
				material.vertexColors = vertexColors;
			}

			materials.push(material);
		}

		// Flat (untextured) fallback material at the last index
		materials.push(basicMaterial);
		const flatMaterialIndex = materials.length - 1;

		return { materials, flatMaterialIndex };
	}

	// ----------------------------------------------------------------------------
	// Add objects from the PRM and CMP files to the scene

	createScene(files: Record<string, ArrayBuffer>, modify?: { scale?: number; move?: Vector3; space?: number }): void {
		const rawImages = files['textures'] ? this.unpackImages(files['textures']!) : [];
		const images = rawImages.map(this.readImage.bind(this));

		this.sceneMaterial = this.createMeshFaceMaterial(images, true, FrontSide);

		const objects = this.readObjects(files['objects']!);
		for (let i = 0; i < objects.length; i++) {
			const model = this.createModelFromObject(objects[i]);
			if (modify?.scale) model.scale.setScalar(modify.scale);
			if (modify?.move) model.position.add(modify.move);
			if (modify?.space) model.position.x += (i + 0.5 - objects.length / 2) * modify.space;
			this.scene.add(model);
		}
	}

	// ----------------------------------------------------------------------------
	// Add a track from TRV, TRF, CMP and TTF files to the scene.
	// Replaces THREE.Geometry + THREE.Face3 with BufferGeometry groups.

	createTrack(files: Record<string, ArrayBuffer>): void {
		const rawImages = this.unpackImages(files['textures']!);
		const images = rawImages.map(this.readImage.bind(this));

		// Load track texture index
		const indexEntries = files['textureIndex']!.byteLength / TrackTextureIndex.byteLength;
		const textureIndex = TrackTextureIndex.readStructs(files['textureIndex']!, 0, indexEntries);

		// Compose 128×128 images from 4×4 grids of 32×32 tiles
		const composedImages: HTMLCanvasElement[] = [];
		for (const idx of textureIndex) {
			const composedImage = document.createElement('canvas');
			composedImage.width = 128;
			composedImage.height = 128;
			const ctx = composedImage.getContext('2d')!;
			for (let x = 0; x < 4; x++) {
				for (let y = 0; y < 4; y++) {
					ctx.drawImage(images[idx.near[y * 4 + x]]!, x * 32, y * 32);
				}
			}
			composedImages.push(composedImage);
		}

		this.trackMaterial = this.createMeshFaceMaterial(composedImages, true, DoubleSide);

		// Load vertices
		const vertexCount = files['vertices']!.byteLength / TrackVertex.byteLength;
		const rawVertices = TrackVertex.readStructs(files['vertices']!, 0, vertexCount);
		const vertices: Vector3[] = rawVertices.map((v: any) => new Vector3(v.x, -v.y, -v.z));

		// Load faces
		const faceCount = files['faces']!.byteLength / TrackFace.byteLength;
		const faces = TrackFace.readStructs(files['faces']!, 0, faceCount);

		// Optional TEX file (WO2097 only): overrides tile/flags from TRF
		if (files['trackTexture']) {
			const trackTextureCount = files['trackTexture'].byteLength / TrackTexture.byteLength;
			const trackTextures = TrackTexture.readStructs(files['trackTexture'], 0, trackTextureCount);
			for (let i = 0; i < faces.length; i++) {
				faces[i].tile  = trackTextures[i].tile;
				faces[i].flags = trackTextures[i].flags;
			}
		}

		const batches: TriBatch[] = [];

		for (const f of faces) {
			let color = this.int32ToColor(f.color);
			const materialIndex: number = f.tile;

			// Boost: override colour with bright blue
			if (f.flags & TrackFaceFlags.BOOST) {
				color = new Color(0.25, 0.25, 2);
			}

			const col = [color.r, color.g, color.b];
			const flipx = (f.flags & TrackFaceFlags.FLIP) ? 1 : 0;

			// Triangle 1: indices[0], [1], [2]
			const v0 = vertices[f.indices[0]]!;
			const v1 = vertices[f.indices[1]]!;
			const v2 = vertices[f.indices[2]]!;
			batches.push({
				materialIndex,
				positions: [v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z],
				colors:    [...col, ...col, ...col],
				uvs:       [1 - flipx, 1, flipx, 1, flipx, 0],
			});

			// Triangle 2: indices[2], [3], [0]
			const v3 = vertices[f.indices[3]]!;
			batches.push({
				materialIndex,
				positions: [v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, v0.x, v0.y, v0.z],
				colors:    [...col, ...col, ...col],
				uvs:       [flipx, 0, 1 - flipx, 0, 1 - flipx, 1],
			});
		}

		const geometry = buildBufferGeometry(batches);
		if (geometry) {
			const model = new Object3D();
			model.add(new Mesh(geometry, this.trackMaterial.materials));
			this.scene.add(model);
		}

		this.createCameraSpline(files['sections']!, faces, vertices);
	}

	// ----------------------------------------------------------------------------
	// Extract a camera spline from the track section file (.TRS)

	createCameraSpline(buffer: ArrayBuffer, faces: any[], vertices: Vector3[]): void {
		const sectionCount = buffer.byteLength / TrackSection.byteLength;
		const sections = TrackSection.readStructs(buffer, 0, sectionCount);

		const cameraPoints: Vector3[] = [];
		const jumpIndexes: number[] = [];

		// First pass: skip junctions
		let index = 0;
		do {
			const s = sections[index];
			if (s.flags & TrackSectionFlags.JUMP) jumpIndexes.push(cameraPoints.length);
			cameraPoints.push(this.getSectionPosition(s, faces, vertices));
			index = s.next;
		} while (index > 0 && index < sections.length);

		// Second pass: take junctions when possible
		index = 0;
		do {
			const s = sections[index];
			if (s.flags & TrackSectionFlags.JUMP) jumpIndexes.push(cameraPoints.length);
			cameraPoints.push(this.getSectionPosition(s, faces, vertices));

			if (s.nextJunction !== -1 && (sections[s.nextJunction].flags & TrackSectionFlags.JUNCTION_START)) {
				index = s.nextJunction;
			} else {
				index = s.next;
			}
		} while (index > 0 && index < sections.length);

		// Extend path near jumps by adding a tangent offset
		for (const jumpIndex of jumpIndexes) {
			const jumpPoint = cameraPoints[jumpIndex]!;
			const prev = cameraPoints[(jumpIndex + cameraPoints.length - 1) % cameraPoints.length]!;
			const next = cameraPoints[(jumpIndex + 1) % cameraPoints.length]!;
			const tangent = jumpPoint.clone().sub(prev);
			const lengthNext = next.clone().sub(jumpPoint).length();
			jumpPoint.add(tangent.setLength(lengthNext / 4));
		}

		this.cameraSpline = new HermiteCurve3(cameraPoints, 0.5, 0.0);
		// Increase arc length precision to keep constant camera speed during jumps
		this.cameraSpline.arcLengthDivisions = 20000;
	}

	// ----------------------------------------------------------------------------
	// Get the average position of track-flagged vertices for a section

	getSectionPosition(section: any, faces: any[], vertices: Vector3[]): Vector3 {
		let count = 0;
		const position = new Vector3();
		for (let i = section.firstFace; i < section.firstFace + section.numFaces; i++) {
			const face = faces[i];
			if (face.flags & TrackFaceFlags.TRACK) {
				for (const idx of face.indices as number[]) {
					position.add(vertices[idx]!);
					count++;
				}
			}
		}
		position.divideScalar(count);
		return position;
	}

	// ----------------------------------------------------------------------------
	// Load a complete track (scene + sky + track geometry)
	async load(): Promise<void> {
        const track = import.meta.glob<true, 'url'>('../../track/*.{CMP,PRM,TRV,TRF,TRS,TTF,TEX}', { query: 'url', import: 'default', eager: true });
        const getPath = (file: string): string => {
            const url  = track[`../../track/${file}`];
            if (!url) {
                throw new Error(`File ${file} not found in track`);
            }
            return url;
        };

		const tasks: Promise<void>[] = [];
		tasks.push(this.loadBinaries(
			{ textures: getPath('SCENE.CMP'), objects: getPath('SCENE.PRM') },
			files => this.createScene(files),
		));

		tasks.push(this.loadBinaries(
			{ textures: getPath('SKY.CMP'), objects: getPath('SKY.PRM') },
			files => this.createScene(files, { scale: 48 }),
		));

		const trackFiles: Record<string, string> = {
			textures:      getPath('LIBRARY.CMP'),
			textureIndex:  getPath('LIBRARY.TTF'),
			vertices:      getPath('TRACK.TRV'),
			faces:         getPath('TRACK.TRF'),
			sections:      getPath('TRACK.TRS'),
		};

        const trackTexture = track['./track/TRACK.TEX'];
		if (trackTexture) {
			trackFiles['trackTexture'] = trackTexture;
		}

		tasks.push(this.loadBinaries(trackFiles, files => this.createTrack(files)));
		await Promise.all(tasks);
		this.loaded = true;
		this.animate();
	}
}
