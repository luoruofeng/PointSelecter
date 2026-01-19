export class CoordinateSystem {
    constructor() {
        this.matrix = null; // Transformation matrix [a, b, c, d, e, f]
        this.isValid = false;
    }

    /**
     * Calibrate the system using 3 pairs of points.
     * @param {Array} imgPoints Array of {x, y} in image pixels
     * @param {Array} realPoints Array of {x, y} in real world units
     */
    calibrate(imgPoints, realPoints) {
        if (imgPoints.length !== 3 || realPoints.length !== 3) {
            console.error("Need exactly 3 points for calibration");
            return false;
        }

        // We want to find a,b,c,d,e,f such that:
        // x_real = a*x_img + b*y_img + c
        // y_real = d*x_img + e*y_img + f

        // Solve for X coefficients (a, b, c)
        // [ x1 y1 1 ] [ a ]   [ X1 ]
        // [ x2 y2 1 ] [ b ] = [ X2 ]
        // [ x3 y3 1 ] [ c ]   [ X3 ]

        try {
            const abc = this.solveLinearSystem(imgPoints, realPoints.map(p => p.x));
            const def = this.solveLinearSystem(imgPoints, realPoints.map(p => p.y));

            this.matrix = {
                a: abc[0], b: abc[1], c: abc[2],
                d: def[0], e: def[1], f: def[2]
            };
            this.isValid = true;
            return true;
        } catch (e) {
            console.error("Calibration failed", e);
            this.isValid = false;
            return false;
        }
    }

    solveLinearSystem(points, values) {
        // Cramers Rule or Gaussian Elimination for 3x3
        // A = [ [x1, y1, 1], [x2, y2, 1], [x3, y3, 1] ]
        // B = [ v1, v2, v3 ]
        
        const x1 = points[0].x, y1 = points[0].y;
        const x2 = points[1].x, y2 = points[1].y;
        const x3 = points[2].x, y3 = points[2].y;
        
        const D = x1*(y2 - y3) + x2*(y3 - y1) + x3*(y1 - y2);
        
        if (Math.abs(D) < 1e-10) throw new Error("Points are collinear");

        const Da = values[0]*(y2 - y3) + values[1]*(y3 - y1) + values[2]*(y1 - y2);
        const Db = x1*(values[1] - values[2]) + x2*(values[2] - values[0]) + x3*(values[0] - values[1]);
        const Dc = x1*(y2*values[2] - y3*values[1]) + x2*(y3*values[0] - y1*values[2]) + x3*(y1*values[1] - y2*values[0]);

        return [Da/D, Db/D, Dc/D];
    }

    transform(x_img, y_img) {
        if (!this.isValid) return { x: 0, y: 0 };
        const { a, b, c, d, e, f } = this.matrix;
        return {
            x: a * x_img + b * y_img + c,
            y: d * x_img + e * y_img + f
        };
    }
}
