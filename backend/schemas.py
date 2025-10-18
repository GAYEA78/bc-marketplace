from pydantic import BaseModel, Field
from datetime import datetime
import database as db

class User(BaseModel):
    id: str
    name: str
    bc_email: str
    photo_url: str | None = None
    class Config:
        from_attributes = True

class ListingBase(BaseModel):
    title: str
    description: str | None = None
    price: float = Field(gt=0, description="Price must be greater than zero")
    category: db.ListingCategory
    image_url_1: str | None = None
    image_url_2: str | None = None
    image_url_3: str | None = None
    image_url_4: str | None = None

class ListingCreate(ListingBase):
    pass

class ReportCreate(BaseModel):
    reason: str

class Listing(ListingBase):
    id: str
    owner_id: str
    created_at: datetime
    owner: User
    image_url_1: str | None = None
    image_url_2: str | None = None
    image_url_3: str | None = None
    image_url_4: str | None = None
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    body: str

class Message(BaseModel):
    id: str
    thread_id: str
    sender_id: str
    body: str
    created_at: datetime
    sender: User
    class Config:
        from_attributes = True

class Thread(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    updated_at: datetime
    listing: Listing
    buyer: User
    seller: User
    class Config:
        from_attributes = True


class ListingPublic(ListingBase):
    id: str
    owner_id: str
    created_at: datetime

    class Config:
        from_attributes = True