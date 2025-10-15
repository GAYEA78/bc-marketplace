from pydantic import BaseModel
from datetime import datetime
import database as db 

# User Schema
class User(BaseModel):
    id: str
    name: str
    bc_email: str
    photo_url: str | None = None

    class Config:
        from_attributes = True

# Listing Schemas 
class ListingBase(BaseModel):
    title: str
    description: str | None = None
    price: float
    category: db.ListingCategory

class ListingCreate(ListingBase):
    pass

class Listing(ListingBase):
    id: str
    owner_id: str
    created_at: datetime
    owner: User

    class Config:
        from_attributes = True