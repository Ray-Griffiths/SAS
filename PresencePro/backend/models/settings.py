
from .database import db
from sqlalchemy import Column, Integer, String

class Setting(db.Model):
    __tablename__ = 'settings'
    id = Column(Integer, primary_key=True)
    key = Column(String(80), unique=True, nullable=False)
    value = Column(String(120), nullable=False)
    description = Column(String(255), nullable=True)
