# Plotly.js and ECharts DataFrame Demo

A React/TypeScript charting demo backed by FastAPI. It compares Plotly.js and ECharts while loading pandas- or PyArrow-built datasets as Arrow IPC streams. Select one of ten samples (1,000–200,000 rows), a DataFrame source, and a charting library in the browser.

## Docker

```
cd docker
docker build -t ubuntu-dev:1.0 -f ./Dockerfile .
./launch-container.sh ubuntu-dev:1.0 <workspace>
```

## Build and run

Start the FastAPI server in one terminal:

```bash
source /home/user/workpsace/env-python/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --port 7000
```

Start the React application in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (by default `http://localhost:6070`). The Vite development server proxies `/api` requests to FastAPI on port 7000.

Create a production frontend build with:

```bash
cd frontend
npm run build
```
