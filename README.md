# HK School Web

Hong Kong School Admission System.

## Project Structure

- `frontend/`: React + TypeScript + Vite application.
  - `deploy/`: Deployment configurations (Dockerfile, Nginx).
  - `src/`: Source code.
    - `api/`: API integration.
    - `components/`: Shared UI components.
    - `pages/`: Application pages.
    - `store/`: State management (Zustand).
    - `styles/`: Global styles.
- `API_DOCS.md`: Backend API documentation.
- `DESIGN.md`: System design documentation.

## Deployment

### Docker Deployment (Recommended)

This project includes Docker configuration for easy deployment.

1. **Prerequisites**: Ensure Docker and Docker Compose are installed.

2. **Build and Run**:
   ```bash
   docker-compose up -d --build
   ```

   This will start:
   - **Frontend**: Accessible at `http://localhost` (Port 80).
   - **Backend**: (Placeholder configuration) at `http://localhost:8080`.

3. **Configuration**:
   - The frontend Nginx configuration is located at `frontend/deploy/nginx.conf`.
   - The API proxy is configured to forward `/api/` requests to `http://backend:8080/api/`.
   - You can update the backend service in `docker-compose.yml` to point to your actual backend image or build context.

### Frontend Environment Variables

- `VITE_API_URL`: Base URL for the API. Defaults to `/api/v1` (which works with the Nginx proxy).
  - To use an external API directly, set this variable at build time or in your `.env` file.

## Development

1. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Access at `http://localhost:5173`.
