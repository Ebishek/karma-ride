from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    karma_balance = Column(Integer, default=50) # Starting Karma
    trust_rating = Column(Float, default=5.0)
    
    # Relationships
    rides_offered = relationship("Ride", back_populates="helper", foreign_keys="[Ride.helper_id]")
    rides_requested = relationship("RideRequest", back_populates="seeker")

class Ride(Base):
    __tablename__ = 'rides'
    id = Column(Integer, primary_key=True, index=True)
    helper_id = Column(Integer, ForeignKey('users.id'))
    source = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    date_time = Column(DateTime, nullable=False)
    route_waypoints = Column(JSON) # Store Lat/Lng array
    karma_reward = Column(Integer, nullable=False)
    status = Column(String, default="open") # open, matched, completed, cancelled
    
    helper = relationship("User", back_populates="rides_offered", foreign_keys=[helper_id])
    requests = relationship("RideRequest", back_populates="ride")

class RideRequest(Base):
    __tablename__ = 'ride_requests'
    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey('rides.id'))
    seeker_id = Column(Integer, ForeignKey('users.id'))
    status = Column(String, default="pending") # pending, accepted, rejected, completed
    
    ride = relationship("Ride", back_populates="requests")
    seeker = relationship("User", back_populates="rides_requested")

class KarmaTransaction(Base):
    __tablename__ = 'karma_transactions'
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    receiver_id = Column(Integer, ForeignKey('users.id'))
    amount = Column(Integer, nullable=False)
    ride_id = Column(Integer, ForeignKey('rides.id'), nullable=True)
    status = Column(String, default="escrow") # escrow, completed, refunded
    timestamp = Column(DateTime, default=datetime.utcnow)
