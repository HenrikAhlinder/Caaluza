# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Caaluza is a companion app for Caluuza - a web-based 3D LEGO-like brick builder application. It's a Flask-based web application that provides a 3D editor for creating, saving, and generating brick maps. The application uses Three.js for the frontend 3D visualization and SQLite for persistent storage.

## Architecture

### Core Components

- **Controller.py**: Main Flask application with REST API endpoints for map operations (`/`, `/edit`, `/map/<id>`, `/generate`)
- **Brick.py**: Core data models - `Point` (3D coordinates), `Brick` (collection of points with color/name), and `BrickMap` (collection of bricks with metadata)
- **Storage.py**: SQLite-based persistence layer using `maps_store.sqlite` database
- **Mapgenerator/**: Procedural map generation system with brick placement algorithms

### Frontend Structure

- **templates/**: Jinja2 HTML templates (main.html, edit.html)
- **static/**: CSS and JavaScript assets
  - **css/edit.css**: Styling for the 3D editor interface
  - **js/edit.js**: Main frontend logic for 3D scene management and user interactions
  - **js/Brick.js**: Client-side brick manipulation utilities

### API Endpoints

- `GET /`: Main menu page
- `GET /edit`: 3D brick editor interface
- `GET /map/<map_id>`: Load existing map by ID
- `POST /map/<map_id>`: Save map with overwrite protection (requires double-save for existing maps)
- `GET /generate`: Generate random brick map using placement algorithms

## Development Commands

### Running the Application
```bash
python Controller.py
```
The app runs on `http://0.0.0.0:5000` with debug mode enabled.

### Running Tests
```bash
# Run all tests
python -m unittest discover tests/

# Run specific test files
python -m unittest tests.test_Brick
python -m unittest tests.test_Controller
```

### Database Management
The SQLite database (`maps_store.sqlite`) is automatically created on first run. Maps are stored as JSON serialized brick data.

## Key Features

- **3D Visualization**: Real-time Three.js-based brick placement and manipulation
- **Map Persistence**: SQLite storage with JSON serialization of brick maps
- **Procedural Generation**: Algorithm-based random map generation with collision detection
- **Overwrite Protection**: Double-save mechanism prevents accidental map overwrites
- **Responsive UI**: Collapsible brick selector and zoom controls for different screen sizes

## Data Model

- **Point**: 3D coordinates (x, y, z) with addition operations
- **Brick**: Collection of points with color and descriptive name
- **BrickMap**: Container for bricks with metadata (dimensions, name, timestamp)
- Maps serialize to/from JSON with full validation and error handling

## Testing Strategy

- Unit tests cover core data models (Point, Brick, BrickMap serialization)
- Flask integration tests verify API endpoints and storage operations
- Test isolation with database cleanup between test runs