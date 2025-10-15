import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey, Float, Text, Enum
import enum

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    bc_email = Column(String, unique=True, index=True, nullable=False)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ListingCategory(enum.Enum):
    TEXTBOOKS = "Textbooks"
    FURNITURE = "Furniture"
    ELECTRONICS = "Electronics"
    TICKETS = "Tickets"
    OTHER = "Other"

class Listing(Base):
    __tablename__ = "listings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(Enum(ListingCategory, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    owner = relationship("User")