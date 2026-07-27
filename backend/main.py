from fastapi import FastAPI

app = FastAPI()

@app.get("/api/hello_world")
def hello_world():
    return {"message": "Hello, World!"}
