# PointSelecter - Image Coordinate Mapping Tool

A web-based tool to annotate images, establish a real-world coordinate system using reference points, and export labeled coordinate data.

## Features

- **Image Upload**: Support for JPG and PNG formats.
- **Coordinate Calibration**:
  - Define a custom coordinate system by setting 3 reference points:
    1. **Origin**: `(0, 0)`
    2. **X-Axis Point**: `(x, 0)`
    3. **Y-Axis Point**: `(0, y)`
  - Real-time validation of reference points.
- **Point Recognition**:
  - Add points of interest after calibration.
  - Automatic calculation of Real-World coordinates based on the reference system.
- **Labeling**: Group points with custom labels.
- **Export**: Export data to **JSON** or **XML** formats.

## Installation

1. **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```

## Usage

1. **Start the Server**:
   ```bash
   node server.js
   ```
2. **Open the Application**:
   Navigate to `http://localhost:3000` in your web browser.

3. **Step-by-Step Guide**:
   - **Upload**: Click "Select Image" to upload a target image.
   - **Set Location Points (Calibration)**:
     - Click "Add Location Point" (Red button).
     - Click 3 distinct locations on the image to act as references.
     - In the "Location Points" panel on the right, enter the *Real World* coordinates for these points.
     - **Requirement**: You must set exactly:
       - One point at `0, 0`
       - One point at `X, 0` (e.g., `7000, 0`)
       - One point at `0, Y` (e.g., `0, 800`)
   - **Add Recognition Points**:
     - Once calibration is valid, the "Add Recognition Point" button (Blue) will enable.
     - Click it to switch modes, then click on the image to mark points of interest.
     - The real-world coordinates are automatically calculated and displayed in the table.
   - **Labeling**:
     - Select points using the checkboxes in the table.
     - Click "Add Label" to assign a group name (e.g., "Part_A") to the selected points.
   - **Export**:
     - Use the Export buttons to download the point data.

## Project Structure

- `server.js`: Express server handling static files and uploads.
- `public/`: Frontend assets.
  - `js/ImageEditor.js`: Canvas/DOM interaction logic.
  - `js/CoordinateSystem.js`: Affine transformation math.
  - `js/main.js`: Application controller.
