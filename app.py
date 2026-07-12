from fastapi import FastAPI, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from datetime import datetime
import json

from models import User, Ride, RideRequest, KarmaTransaction
from database import init_db, get_db

app = FastAPI(title="KarmaRide MVP")

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize DB
@app.on_event("startup")
def on_startup():
    init_db()
    
    # Seed some mock data if DB is empty
    db = next(get_db())
    if not db.query(User).first():
        user1 = User(name="Alex Helper", phone="1234567890", karma_balance=50)
        user2 = User(name="Sam Seeker", phone="0987654321", karma_balance=50)
        db.add(user1)
        db.add(user2)
        db.commit()

# --- MOCK AUTHENTICATION ---
# For the MVP, we assume user ID 1 is logged in.
def get_current_user(db: Session = Depends(get_db)):
    return db.query(User).filter(User.id == 1).first()

# --- ROUTES ---

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Dashboard showing User Profile and Karma Balance"""
    active_rides = db.query(Ride).filter(Ride.helper_id == current_user.id).all()
    requests_made = db.query(RideRequest).filter(RideRequest.seeker_id == current_user.id).all()
    
    return templates.TemplateResponse("dashboard.html", {
        "request": request, 
        "user": current_user,
        "active_rides": active_rides,
        "requests_made": requests_made
    })

@app.get("/offer", response_class=HTMLResponse)
async def offer_ride_page(request: Request, current_user: User = Depends(get_current_user)):
    """Page to post a new ride (Helper)"""
    return templates.TemplateResponse("offer_ride.html", {"request": request, "user": current_user})

@app.post("/api/rides")
async def create_ride(
    source: str = Form(...),
    destination: str = Form(...),
    date_time_str: str = Form(...),
    karma_reward: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """API to create a new ride"""
    ride_date = datetime.fromisoformat(date_time_str)
    
    new_ride = Ride(
        helper_id=current_user.id,
        source=source,
        destination=destination,
        date_time=ride_date,
        karma_reward=karma_reward
    )
    db.add(new_ride)
    db.commit()
    return RedirectResponse(url="/", status_code=303)

@app.get("/find", response_class=HTMLResponse)
async def find_ride_page(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Page to search and request rides (Seeker)"""
    # Fetch all open rides not created by current user
    available_rides = db.query(Ride).filter(Ride.status == 'open', Ride.helper_id != current_user.id).all()
    return templates.TemplateResponse("find_ride.html", {
        "request": request, 
        "user": current_user, 
        "rides": available_rides
    })

@app.post("/api/request/{ride_id}")
async def request_ride(ride_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Seeker requests a ride -> Deducts Karma -> Escrow"""
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride or ride.status != 'open':
        return {"error": "Ride not available"}
        
    if current_user.karma_balance < ride.karma_reward:
        return {"error": "Insufficient Karma Points"}
        
    # Deduct Karma
    current_user.karma_balance -= ride.karma_reward
    
    # Create Escrow Transaction
    transaction = KarmaTransaction(
        sender_id=current_user.id,
        receiver_id=ride.helper_id,
        amount=ride.karma_reward,
        ride_id=ride.id,
        status="escrow"
    )
    db.add(transaction)
    
    # Create Ride Request
    ride_req = RideRequest(
        ride_id=ride.id,
        seeker_id=current_user.id
    )
    db.add(ride_req)
    
    # Update ride status
    ride.status = "matched"
    
    db.commit()
    return RedirectResponse(url="/", status_code=303)
