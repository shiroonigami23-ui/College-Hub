from pydantic import BaseModel, HttpUrl


class Announcement(BaseModel):
    id: int
    title: str
    detail: str
    audience: str
    posted_at: str


class CampusEvent(BaseModel):
    id: int
    name: str
    date: str
    venue: str
    registration_url: HttpUrl


class Resource(BaseModel):
    id: int
    name: str
    category: str
    url: HttpUrl
