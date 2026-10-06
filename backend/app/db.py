from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import db_url

engine = create_engine(db_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)