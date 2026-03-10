from app.schemas import Announcement, CampusEvent, Resource

ANNOUNCEMENTS = [
    Announcement(id=1, title="Mid-Sem Schedule Released", detail="Check department notice boards and portal timetable.", audience="All Students", posted_at="2026-03-05"),
    Announcement(id=2, title="Library Extended Hours", detail="Main library remains open until 10 PM during exams.", audience="Hostellers", posted_at="2026-03-07"),
]

EVENTS = [
    CampusEvent(id=1, name="Innovation Hack Day", date="2026-04-11", venue="Auditorium", registration_url="https://example.edu/hackday"),
    CampusEvent(id=2, name="Career Connect Drive", date="2026-04-24", venue="Placement Cell", registration_url="https://example.edu/careers"),
]

RESOURCES = [
    Resource(id=1, name="Academic Calendar", category="Academics", url="https://example.edu/calendar"),
    Resource(id=2, name="Exam Form Portal", category="Exams", url="https://example.edu/exam-form"),
    Resource(id=3, name="Scholarship Desk", category="Finance", url="https://example.edu/scholarships"),
]
