from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from Backend.app.core.database import Base, engine

from Backend.app.models.user import User
from Backend.app.models.dataset import Dataset
from Backend.app.models.job import Job
from Backend.app.models.ml_model import MLModel
from Backend.app.models.predictions import Prediction
from Backend.app.models.api_key import ApiKey


from Backend.app.api.routes.auth import router as auth_router
from Backend.app.api.routes.datasets import router as dataset_router
from Backend.app.api.routes.preprocessing import router as preprocessing_router
from Backend.app.api.routes.analysis import router as analysis_router
from Backend.app.api.routes.ml import router as ml_router
from Backend.app.api.routes.visualization import router as visual_router
from Backend.app.api.routes.predictions import router as prediction_router
from Backend.app.api.routes.jobs import router as jobs_router
from Backend.app.api.routes.model_management import router as model_management_router
from Backend.app.api.routes.demo import router as demo_router


app = FastAPI(
    title="ML Analysis Project",
    version="1.0.0"
)

# Ensure chart storage directory exists and serve static files
os.makedirs("storage/charts", exist_ok=True)
app.mount("/charts", StaticFiles(directory="storage/charts"), name="charts")

Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dataset_router)
app.include_router(preprocessing_router)
app.include_router(analysis_router)
app.include_router(ml_router)
app.include_router(visual_router)
app.include_router(prediction_router)
app.include_router(jobs_router)
app.include_router(model_management_router)
app.include_router(demo_router)

@app.get("/")
def home():
    return {"message": "ML Analysis Project running"}