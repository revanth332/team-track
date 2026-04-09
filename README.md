team_management_backend/
│
├── .env # Environment variables (DB URI, JWT secret, etc.)
├── .gitignore # Files to ignore in Git
├── requirements.txt # Python dependencies (fastapi, motor, pydantic, etc.)
├── run.py # Script to run the uvicorn server locally
│
└── app/ # Main application directory
├── **init**.py
├── main.py # FastAPI application instance & entry point
│
├── core/ # App-wide settings and configurations
│ ├── **init**.py
│ ├── config.py # Pydantic BaseSettings for env vars
│ ├── database.py # MongoDB connection setup (Motor client)
│ └── security.py # Password hashing and JWT token logic
│
├── models/ # Database Models (MongoDB document structures)
│ ├── **init**.py
│ ├── user.py # Profiles, skills, default shifts
│ ├── goal.py # Quarterly goals (blogs/videos)
│ ├── shift.py # Shift change logs
│ └── update.py # Weekly status updates
│
├── schemas/ # Pydantic Models (API Request/Response validation)
│ ├── **init**.py
│ ├── user.py # e.g., UserCreate, UserResponse
│ ├── goal.py # e.g., GoalCreate, GoalUpdate
│ ├── shift.py  
 │ └── update.py  
 │
├── services/ # Business Logic & DB Operations (CRUD)
│ ├── **init**.py
│ ├── user_service.py # Functions to insert/find users in MongoDB
│ ├── goal_service.py
│ ├── shift_service.py
│ └── update_service.py
│
└── api/ # API Routing (Endpoints)
├── **init**.py
├── dependencies.py # Reusable dependencies (e.g., get_current_user)
└── v1/ # API Version 1
├── **init**.py
├── router.py # Combines all v1 routes into one APIRouter
├── users.py # GET /users, PUT /users/{id}
├── goals.py # POST /goals, GET /goals
├── shifts.py # POST /shifts, GET /shifts
└── updates.py # POST /updates, GET /updates
