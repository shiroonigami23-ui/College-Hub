from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.data import ANNOUNCEMENTS, EVENTS, RESOURCES
from app.schemas import Announcement, CampusEvent, Resource

app = FastAPI(title="College Hub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/announcements", response_model=list[Announcement])
def announcements() -> list[Announcement]:
    return ANNOUNCEMENTS


@app.get("/api/events", response_model=list[CampusEvent])
def events() -> list[CampusEvent]:
    return EVENTS


@app.get("/api/resources", response_model=list[Resource])
def resources() -> list[Resource]:
    return RESOURCES
