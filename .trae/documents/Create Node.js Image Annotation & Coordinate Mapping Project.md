I will create a standard Node.js project (using Express) that provides a web interface for image annotation and coordinate mapping.

### Project Structure
- `server.js`: Main entry point using Express to serve the app and handle image uploads.
- `public/`: Static files directory.
  - `index.html`: Main UI layout.
  - `style.css`: Modern styling for a polished look.
  - `js/`: Frontend logic.
    - `main.js`: Application logic and event handling.
    - `ImageEditor.js`: Reusable component for image interaction and point rendering.
    - `CoordinateSystem.js`: Logic for coordinate transformation (Image px <-> Real World).
- `uploads/`: Directory to store uploaded images.

### Features & Implementation Details

1.  **Image Upload**:
    - Backend: `multer` middleware to handle `.jpg` and `.png` uploads.
    - Frontend: Display the uploaded image on the canvas/container.

2.  **Location Points (Red)**:
    - User clicks to add points.
    - Dynamic table/list below image to input Real World (X, Y) coordinates.
    - **Validation**: Ensure 3 points are set: Origin (0,0), X-Axis (x,0), Y-Axis (0,y).

3.  **Coordinate Transformation**:
    - Implement an Affine Transformation algorithm to map pixel coordinates to real-world coordinates based on the 3 user-defined reference points.

4.  **Recognition Points (Blue)**:
    - Enabled only after calibration (3 valid location points).
    - Auto-incrementing IDs.
    - Display calculated real-world coordinates.
    - Selection checkboxes for batch labeling.

5.  **Labeling & Export**:
    - "Add Label" modal to tag selected recognition points.
    - **Export**:
        - JSON: `{ "labelName": [{id: 1, x: 10, y: 20}, ...], ... }`
        - XML: Structured similarly.

6.  **UI/UX**:
    - Clean, modern design with clear visual feedback (colors for point types, hover states).
    - Interactive image area (zoom/pan support if possible, or simple scroll).

7.  **Documentation**:
    - `README.md` with installation, startup (`npm start`), and usage steps.

### Dependencies
- `express`: Web server.
- `multer`: File upload handling.
- `body-parser`: Request parsing.
