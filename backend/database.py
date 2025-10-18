import os
import uuid
import enum
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, ForeignKey, Float, Text, Enum
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    is_admin = Column(Boolean, default=False, nullable=False)
    name = Column(String, index=True)
    bc_email = Column(String, unique=True, index=True, nullable=False)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_banned = Column(Boolean, default=False, nullable=False)

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
    main_image_url = Column(String, nullable=True)
    owner = relationship("User")
    image_url_1 = Column(String, nullable=True)
    image_url_2 = Column(String, nullable=True)
    image_url_3 = Column(String, nullable=True)
    image_url_4 = Column(String, nullable=True)
    message_threads = relationship("MessageThread", back_populates="listing", cascade="all, delete-orphan")

class MessageThread(Base):
    __tablename__ = "message_threads"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id = Column(String, ForeignKey("listings.id"), nullable=False)
    buyer_id = Column(String, ForeignKey("users.id"), nullable=False)
    seller_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    listing = relationship("Listing", back_populates="message_threads")
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String, ForeignKey("message_threads.id"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    thread = relationship("MessageThread", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])

class BannedEmail(Base):
    __tablename__ = "banned_emails"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()