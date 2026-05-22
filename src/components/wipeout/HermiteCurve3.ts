// Based on http://paulbourke.net/miscellaneous/interpolation/
// tension: 1 high, 0 normal, -1 low
// bias: 0 is even, positive is towards first segment, negative towards the other

import { Curve, Vector3 } from 'three';

function hermiteInterpolate(
	p0: number, p1: number, p2: number, p3: number,
	t: number, tension: number, bias: number
): number {
	const m0 = (p1 - p0) * (1 + bias) * (1 - tension) / 2
	           + (p2 - p1) * (1 - bias) * (1 - tension) / 2;

	const m1 = (p2 - p1) * (1 + bias) * (1 - tension) / 2
	           + (p3 - p2) * (1 - bias) * (1 - tension) / 2;

	const t2 = t * t;
	const t3 = t2 * t;

	const h0 = 2 * t3 - 3 * t2 + 1;
	const h1 = t3 - 2 * t2 + t;
	const h2 = t3 - t2;
	const h3 = -2 * t3 + 3 * t2;

	return h0 * p1 + h1 * m0 + h2 * m1 + h3 * p2;
}

export class HermiteCurve3 extends Curve<Vector3> {
	points: Vector3[];
	tension: number;
	bias: number;

	constructor(points: Vector3[] = [], tension = 0.0, bias = 0.0) {
		super();
		this.points = points;
		this.tension = tension;
		this.bias = bias;
	}

	override getPoint(t: number): Vector3 {
		const points = this.points;
		const point = (points.length - 1) * t;

		const intPoint = Math.floor(point);
		const weight = point - intPoint;

		const p0 = points[intPoint === 0 ? intPoint : intPoint - 1]!;
		const p1 = points[intPoint]!;
		const p2 = points[intPoint > points.length - 2 ? points.length - 1 : intPoint + 1]!;
		const p3 = points[intPoint > points.length - 3 ? points.length - 1 : intPoint + 2]!;

		return new Vector3(
			hermiteInterpolate(p0.x, p1.x, p2.x, p3.x, weight, this.tension, this.bias),
			hermiteInterpolate(p0.y, p1.y, p2.y, p3.y, weight, this.tension, this.bias),
			hermiteInterpolate(p0.z, p1.z, p2.z, p3.z, weight, this.tension, this.bias),
		);
	}
}
